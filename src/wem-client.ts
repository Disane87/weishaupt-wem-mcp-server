import axios, { AxiosInstance } from 'axios';
import { CookieJar } from 'tough-cookie';
import { wrapper } from 'axios-cookiejar-support';

// --- Interfaces ---

export interface WEMModule {
  Index: number;
  Type: number;
  Name: string;
}

export interface WEMDevice {
  ID: string;
  Name: string;
  ConnectionStatus: number;
  Modules: WEMModule[];
}

export interface WEMParameterMeta {
  ParameterID: string;
  Name: string;
  IsWriteable: boolean;
  DataType: number;
  EnumValues?: { Value: number; Description: string }[];
  MinValue?: number;
  MaxValue?: number;
}

export interface WEMParameterValue {
  ParameterID: string;
  NumericValue: number;
  StringValue: string;
  Unit: string;
}

export interface WEMParameterFull {
  ParameterID: string;
  Name: string;
  NumericValue: number;
  StringValue: string;
  Unit: string;
  IsWriteable: boolean;
  MinValue?: number;
  MaxValue?: number;
  EnumValues?: { Value: number; Description: string }[];
}

// --- Client ---

export class WEMClient {
  private client: AxiosInstance;
  private cookieJar: CookieJar;
  private authenticated: boolean = false;
  private loginPromise: Promise<void> | null = null;
  private username: string;
  private password: string;

  constructor(username: string, password: string, baseUrl: string = 'https://www.wemportal.com/app') {
    this.username = username;
    this.password = password;
    this.cookieJar = new CookieJar();

    this.client = wrapper(axios.create({
      baseURL: baseUrl,
      timeout: 30000,
      headers: {
        'User-Agent': 'WeishauptWEMApp',
        'X-Api-Version': '2.0.0.0',
        'Accept': 'application/json',
        'Content-Type': 'application/json',
      },
      jar: this.cookieJar,
    }));
  }

  // --- Auth ---

  async login(): Promise<void> {
    try {
      const response = await this.client.post('/Account/Login', {
        Name: this.username,
        PasswordUTF8: this.password,
        AppID: 'com.weishaupt.wemapp',
        AppVersion: '2.0.2',
        ClientOS: 'Android',
      });

      if (response.data && response.data.Status === 0) {
        this.authenticated = true;
        return;
      }

      throw new Error(response.data?.Message || 'Login failed');
    } catch (error: any) {
      this.authenticated = false;
      if (error.response) {
        throw new Error(`Login failed (HTTP ${error.response.status}): ${error.response.data?.Message || error.message}`);
      }
      throw error;
    }
  }

  async logout(): Promise<void> {
    if (this.authenticated) {
      try {
        await this.client.post('/Account/Logout');
      } catch {
        // ignore
      }
      this.authenticated = false;
    }
  }

  private async ensureAuthenticated(): Promise<void> {
    if (this.authenticated) return;

    // If a login is already in progress, wait for it instead of starting a new one
    if (this.loginPromise) {
      await this.loginPromise;
      return;
    }

    this.loginPromise = this.login();
    try {
      await this.loginPromise;
    } finally {
      this.loginPromise = null;
    }
  }

  private async withRetry<T>(fn: () => Promise<T>): Promise<T> {
    await this.ensureAuthenticated();
    try {
      return await fn();
    } catch (error: any) {
      if (error.response?.status === 401 || error.response?.status === 403) {
        this.authenticated = false;
        await this.ensureAuthenticated();
        return await fn();
      }
      throw error;
    }
  }

  // --- Devices ---

  async getDevices(): Promise<WEMDevice[]> {
    return this.withRetry(async () => {
      const response = await this.client.get('/Device/Read');
      return response.data?.Devices || [];
    });
  }

  // --- Parameter Metadata ---

  async getParameterMeta(deviceId: string, moduleIndex: number, moduleType: number): Promise<WEMParameterMeta[]> {
    return this.withRetry(async () => {
      const response = await this.client.post('/EventType/Read', {
        DeviceID: deviceId,
        ModuleIndex: moduleIndex,
        ModuleType: moduleType,
      });
      return response.data?.Parameters || [];
    });
  }

  // --- Read Parameters ---

  async refreshParameters(deviceId: string, modules: { moduleIndex: number; moduleType: number; parameterIds: string[] }[]): Promise<void> {
    await this.withRetry(async () => {
      await this.client.post('/DataAccess/Refresh', {
        DeviceID: deviceId,
        Modules: modules.map(m => ({
          ModuleIndex: m.moduleIndex,
          ModuleType: m.moduleType,
          Parameters: m.parameterIds.map(id => ({ ParameterID: id })),
        })),
      });
    });
  }

  async readParameters(deviceId: string, modules: { moduleIndex: number; moduleType: number; parameterIds: string[] }[]): Promise<{ ModuleIndex: number; ModuleType: number; Values: WEMParameterValue[] }[]> {
    return this.withRetry(async () => {
      const response = await this.client.post('/DataAccess/Read', {
        DeviceID: deviceId,
        Modules: modules.map(m => ({
          ModuleIndex: m.moduleIndex,
          ModuleType: m.moduleType,
          Parameters: m.parameterIds.map(id => ({ ParameterID: id })),
        })),
      });
      return response.data?.Modules || [];
    });
  }

  /**
   * High-level: Get all parameters for a module with metadata + current values
   */
  async getAllParameters(deviceId: string, moduleIndex: number, moduleType: number): Promise<WEMParameterFull[]> {
    // Step 1: Get parameter metadata
    const meta = await this.getParameterMeta(deviceId, moduleIndex, moduleType);
    if (meta.length === 0) return [];

    const parameterIds = meta.map(p => p.ParameterID);
    const moduleRef = [{ moduleIndex, moduleType, parameterIds }];

    // Step 2: Refresh data from device
    await this.refreshParameters(deviceId, moduleRef);

    // Step 3: Read current values
    const result = await this.readParameters(deviceId, moduleRef);
    const values = result[0]?.Values || [];

    // Merge metadata + values
    const valueMap = new Map(values.map(v => [v.ParameterID, v]));
    return meta.map(m => {
      const val = valueMap.get(m.ParameterID);
      return {
        ParameterID: m.ParameterID,
        Name: m.Name,
        NumericValue: val?.NumericValue ?? 0,
        StringValue: val?.StringValue ?? '',
        Unit: val?.Unit ?? '',
        IsWriteable: m.IsWriteable,
        MinValue: m.MinValue,
        MaxValue: m.MaxValue,
        EnumValues: m.EnumValues,
      };
    });
  }

  // --- Write Parameter ---

  async writeParameter(deviceId: string, moduleIndex: number, moduleType: number, parameterId: string, numericValue: number, stringValue: string = ''): Promise<void> {
    await this.withRetry(async () => {
      await this.client.post('/DataAccess/Write', {
        DeviceID: deviceId,
        Modules: [{
          ModuleIndex: moduleIndex,
          ModuleType: moduleType,
          Parameters: [{
            ParameterID: parameterId,
            NumericValue: numericValue,
            StringValue: stringValue,
          }],
        }],
      });
    });
  }

  // --- High-level: Full device overview ---

  async getDeviceOverview(deviceId: string): Promise<{ device: WEMDevice; modules: { moduleName: string; moduleIndex: number; moduleType: number; parameters: WEMParameterFull[] }[] }> {
    const devices = await this.getDevices();
    const device = devices.find(d => String(d.ID) === String(deviceId));
    if (!device) throw new Error(`Device ${deviceId} not found`);

    const modules: { moduleName: string; moduleIndex: number; moduleType: number; parameters: WEMParameterFull[] }[] = [];

    for (const mod of device.Modules) {
      try {
        const params = await this.getAllParameters(deviceId, mod.Index, mod.Type);
        modules.push({
          moduleName: mod.Name,
          moduleIndex: mod.Index,
          moduleType: mod.Type,
          parameters: params,
        });
      } catch {
        // Some modules may not support parameter reading
        modules.push({
          moduleName: mod.Name,
          moduleIndex: mod.Index,
          moduleType: mod.Type,
          parameters: [],
        });
      }
    }

    return { device, modules };
  }

  // --- Device Status ---

  async getDeviceStatus(deviceId: string): Promise<any> {
    return this.withRetry(async () => {
      const response = await this.client.post('/DeviceStatus/Read', {
        DeviceID: deviceId,
      });
      return response.data;
    });
  }
}

import type { Order } from '../types';

interface BluetoothNavigator extends Navigator {
  bluetooth?: {
    requestDevice: (options: {
      acceptAllDevices?: boolean;
      filters?: Array<{ services?: string[]; namePrefix?: string }>;
      optionalServices?: string[];
    }) => Promise<BluetoothDeviceLike>;
  };
}

interface BluetoothDeviceLike {
  id: string;
  name?: string;
  addEventListener?: (type: string, listener: () => void) => void;
  gatt?: {
    connected: boolean;
    connect: () => Promise<BluetoothGATTServerLike>;
    disconnect: () => void;
  };
}

interface BluetoothGATTServerLike {
  getPrimaryServices: () => Promise<BluetoothGATTServiceLike[]>;
}

interface BluetoothGATTServiceLike {
  uuid: string;
  getCharacteristics: () => Promise<BluetoothGATTCharacteristicLike[]>;
}

interface BluetoothGATTCharacteristicLike {
  uuid: string;
  properties: {
    write: boolean;
    writeWithoutResponse: boolean;
  };
  writeValue: (value: BufferSource) => Promise<void>;
  writeValueWithoutResponse?: (value: BufferSource) => Promise<void>;
  writeValueWithResponse?: (value: BufferSource) => Promise<void>;
}

interface CapacitorBlePlugin {
  initialize?: (options?: { androidNeverForLocation?: boolean }) => Promise<void>;
  requestDevice?: (options?: { optionalServices?: string[] }) => Promise<{ deviceId: string; name?: string }>;
  connect?: (options: { deviceId: string }) => Promise<void>;
  disconnect?: (options: { deviceId: string }) => Promise<void>;
  getServices?: (options: { deviceId: string }) => Promise<{
    services: Array<{
      uuid: string;
      characteristics: Array<{
        uuid: string;
        properties?: { write?: boolean; writeWithoutResponse?: boolean };
      }>;
    }>;
  }>;
  write?: (options: { deviceId: string; service: string; characteristic: string; value: string }) => Promise<void>;
  writeWithoutResponse?: (options: {
    deviceId: string;
    service: string;
    characteristic: string;
    value: string;
  }) => Promise<void>;
}

// Comprehensive list of BLE thermal printer service UUIDs (Xprinter, Gprinter, Hoin, Rongta, PT-210, MTP-II, Cat/PeriPage, Star, Nordic UART, HM-10)
const COMMON_PRINTER_SERVICES = [
  '000018f0-0000-1000-8000-00805f9b34fb',
  '49535343-fe7d-4ae5-8fa9-9fafd205e455',
  'e7810a71-73ae-499d-8c15-faa9aef0c3f2',
  '0000ffe0-0000-1000-8000-00805f9b34fb',
  '0000ff00-0000-1000-8000-00805f9b34fb',
  '0000fff0-0000-1000-8000-00805f9b34fb',
  '0000ae30-0000-1000-8000-00805f9b34fb',
  '0000af30-0000-1000-8000-00805f9b34fb',
  '0000fee7-0000-1000-8000-00805f9b34fb',
  '6e400001-b5a3-f393-e0a9-e50e24dcca9e',
];

// System GATT services that MUST NEVER be used for thermal printing
const IGNORED_SYSTEM_SERVICES = new Set(['1800', '1801', '180a', '180f', '1812']);

// Preferred printer characteristic UUID short/full identifiers
const PREFERRED_PRINT_CHAR_PREFIXES = [
  '00002af1', // 0x18F0 standard POS write char
  'bef8d6c9', // e7810a71 Munbyn / Rongta / Goojprt write char
  '49535343-8841', // ISSC Transparent UART TX/RX
  '49535343-aca3', // ISSC alt write char
  '0000ffe1', // HM-10 / JDY serial char
  '0000ffe2', // HM-10 secondary write char
  '0000ff02', // 0xFF00 POS printer write char
  '0000ff01', // 0xFF00 alt write char
  '0000fff2', // 0xFFF0 printer write char
  '0000fff1', // 0xFFF0 alt write char
  '0000ae01', // 0xAE30 mini cat/pocket printer write char
  '6e400002', // Nordic UART RX char
];

function shortUuid(uuid: string): string {
  const lower = uuid.toLowerCase();
  if (lower.startsWith('0000') && lower.endsWith('-0000-1000-8000-00805f9b34fb')) {
    return lower.slice(4, 8);
  }
  return lower;
}

function isIgnoredService(serviceUuid: string): boolean {
  return IGNORED_SYSTEM_SERVICES.has(shortUuid(serviceUuid));
}

function scoreCharacteristic(serviceUuid: string, charUuid: string, props: { write?: boolean; writeWithoutResponse?: boolean }): number {
  if (!props.write && !props.writeWithoutResponse) return -1;
  if (isIgnoredService(serviceUuid)) return -1;

  const cu = charUuid.toLowerCase();
  const su = serviceUuid.toLowerCase();

  let score = props.writeWithoutResponse ? 15 : 10;

  // Boost if service is a known thermal printer service
  if (COMMON_PRINTER_SERVICES.includes(su)) {
    score += 40;
  }

  // Strongly boost known printer data write characteristics in priority order
  for (let i = 0; i < PREFERRED_PRINT_CHAR_PREFIXES.length; i++) {
    if (cu.startsWith(PREFERRED_PRINT_CHAR_PREFIXES[i])) {
      score += 200 - i * 5;
      break;
    }
  }

  return score;
}

function getCapacitorBle(): CapacitorBlePlugin | null {
  if (typeof window === 'undefined') return null;
  const cap = (window as unknown as { Capacitor?: { Plugins?: { BluetoothLe?: CapacitorBlePlugin } } }).Capacitor;
  return cap?.Plugins?.BluetoothLe || null;
}

let connectedDevice: BluetoothDeviceLike | null = null;
let writableCharacteristic: BluetoothGATTCharacteristicLike | null = null;
let connectedServiceUuid = '';
let connectedCharUuid = '';

// Capacitor native BLE state (for Android APK)
let capConnected: {
  deviceId: string;
  name: string;
  service: string;
  characteristic: string;
  useWriteWithoutResponse: boolean;
} | null = null;

export function isWebBluetoothSupported(): boolean {
  return typeof navigator !== 'undefined' && Boolean((navigator as BluetoothNavigator).bluetooth);
}

export function isAnyBluetoothSupported(): boolean {
  return isWebBluetoothSupported() || Boolean(getCapacitorBle()?.requestDevice);
}

export function getConnectedPrinterName(): string | null {
  if (capConnected) return capConnected.name;
  if (connectedDevice && writableCharacteristic) {
    return connectedDevice.name || 'Bluetooth Thermal Printer';
  }
  return null;
}

export function getConnectedPrinterDebugInfo(): string | null {
  if (capConnected) {
    return `APK BLE · ${shortUuid(capConnected.service)}/${shortUuid(capConnected.characteristic)}`;
  }
  if (connectedDevice && writableCharacteristic) {
    return `WebBLE · ${shortUuid(connectedServiceUuid)}/${shortUuid(connectedCharUuid)}`;
  }
  return null;
}

async function resolveBestWebBleCharacteristic(
  server: BluetoothGATTServerLike
): Promise<{ serviceUuid: string; char: BluetoothGATTCharacteristicLike }> {
  const services = await server.getPrimaryServices();
  let best: { score: number; serviceUuid: string; char: BluetoothGATTCharacteristicLike } | null = null;

  for (const service of services) {
    if (isIgnoredService(service.uuid)) continue;
    try {
      const chars = await service.getCharacteristics();
      for (const ch of chars) {
        const s = scoreCharacteristic(service.uuid, ch.uuid, ch.properties);
        if (s > 0 && (!best || s > best.score)) {
          best = { score: s, serviceUuid: service.uuid, char: ch };
        }
      }
    } catch {
      // Skip unreadable services
    }
  }

  if (!best) {
    throw new Error(
      'Printer connected, but no writable ESC/POS serial characteristic was exposed. If your printer uses Classic SPP instead of BLE, use Chrome/Print Service or USB OTG.'
    );
  }

  return { serviceUuid: best.serviceUuid, char: best.char };
}

export async function connectThermalPrinter(): Promise<string> {
  // 1. Try Web Bluetooth first (Desktop Chrome, Android Chrome, Android WebView if available)
  const nav = typeof navigator !== 'undefined' ? (navigator as BluetoothNavigator) : null;
  if (nav?.bluetooth) {
    const device = await nav.bluetooth.requestDevice({
      acceptAllDevices: true,
      optionalServices: COMMON_PRINTER_SERVICES,
    });

    if (!device.gatt) {
      throw new Error('Selected Bluetooth device does not support GATT printing.');
    }

    const server = await device.gatt.connect();
    const resolved = await resolveBestWebBleCharacteristic(server);

    connectedDevice = device;
    writableCharacteristic = resolved.char;
    connectedServiceUuid = resolved.serviceUuid;
    connectedCharUuid = resolved.char.uuid;
    capConnected = null;

    device.addEventListener?.('gattserverdisconnected', () => {
      writableCharacteristic = null;
    });

    return device.name || 'Mini Thermal Printer';
  }

  // 2. Fallback to Capacitor Native BLE Plugin inside Android APK
  const capBle = getCapacitorBle();
  if (capBle?.requestDevice && capBle.connect && capBle.getServices) {
    await capBle.initialize?.({ androidNeverForLocation: true }).catch(() => undefined);
    const dev = await capBle.requestDevice({ optionalServices: COMMON_PRINTER_SERVICES });
    await capBle.connect({ deviceId: dev.deviceId });
    const { services } = await capBle.getServices({ deviceId: dev.deviceId });

    let best: {
      score: number;
      service: string;
      characteristic: string;
      useWriteWithoutResponse: boolean;
    } | null = null;

    for (const svc of services) {
      for (const ch of svc.characteristics) {
        const props = ch.properties || {};
        const s = scoreCharacteristic(svc.uuid, ch.uuid, props);
        if (s > 0 && (!best || s > best.score)) {
          best = {
            score: s,
            service: svc.uuid,
            characteristic: ch.uuid,
            useWriteWithoutResponse: Boolean(props.writeWithoutResponse),
          };
        }
      }
    }

    if (!best) {
      throw new Error('No writable thermal print characteristic found on this device.');
    }

    capConnected = {
      deviceId: dev.deviceId,
      name: dev.name || 'Mini Thermal Printer',
      service: best.service,
      characteristic: best.characteristic,
      useWriteWithoutResponse: best.useWriteWithoutResponse,
    };
    connectedDevice = null;
    writableCharacteristic = null;
    return capConnected.name;
  }

  throw new Error(
    'Bluetooth LE printing requires Chrome (Android / Desktop) or the Inaya Admin Android APK. Use System / PDF Print on unsupported browsers.'
  );
}

export function disconnectThermalPrinter(): void {
  try {
    connectedDevice?.gatt?.disconnect();
  } catch {
    // ignore
  }
  if (capConnected) {
    void getCapacitorBle()?.disconnect?.({ deviceId: capConnected.deviceId }).catch(() => undefined);
  }
  connectedDevice = null;
  writableCharacteristic = null;
  connectedServiceUuid = '';
  connectedCharUuid = '';
  capConnected = null;
}

function toAsciiSafe(input: string): string {
  return String(input || '')
    .replace(/৳/g, 'Tk.')
    .replace(/[×✕]/g, 'x')
    .replace(/[—–]/g, '-')
    .replace(/[^\x20-\x7E]/g, '?')
    .trim();
}

function buildEscPosLabelBytes(order: Order): Uint8Array {
  const encoder = new TextEncoder();
  const chunks: number[] = [];

  const pushBytes = (...bytes: number[]) => chunks.push(...bytes);
  const pushLine = (txt = '') => {
    const encoded = encoder.encode(toAsciiSafe(txt) + '\r\n');
    chunks.push(...encoded);
  };

  // ESC @ (Reset/Initialize printer)
  pushBytes(0x1b, 0x40);
  // Line spacing default
  pushBytes(0x1b, 0x32);

  // Center align + Double size header
  pushBytes(0x1b, 0x61, 0x01);
  pushBytes(0x1b, 0x45, 0x01); // Bold on
  pushBytes(0x1d, 0x21, 0x11); // 2x width & 2x height
  pushLine('INAYA FASHION');
  pushBytes(0x1d, 0x21, 0x00); // Normal size
  pushBytes(0x1b, 0x45, 0x00); // Bold off
  pushLine('Dhaka, Bangladesh');
  pushLine('--------------------------------');

  // Left align details
  pushBytes(0x1b, 0x61, 0x00);
  pushBytes(0x1b, 0x45, 0x01);
  pushLine(`INV: ${order.invoice}`);
  if (order.steadfastConsignmentId) {
    pushLine(`STEADFAST CID: ${order.steadfastConsignmentId}`);
  }
  if (order.steadfastTrackingCode) {
    pushLine(`TRACK: ${order.steadfastTrackingCode}`);
  }
  pushBytes(0x1b, 0x45, 0x00);
  pushLine('--------------------------------');
  pushLine(`TO: ${order.customerName}`);
  pushLine(`PH: ${order.customerPhone}`);
  pushLine(`ADDR: ${order.customerAddress}`);
  pushLine('--------------------------------');

  for (const item of order.items) {
    pushLine(item.productName.slice(0, 30));
    pushLine(` ${item.size} / ${item.color} x${item.quantity} - Tk.${item.price * item.quantity}`);
  }

  pushLine('--------------------------------');
  pushBytes(0x1b, 0x45, 0x01);
  pushBytes(0x1d, 0x21, 0x01); // Double height for COD amount
  pushLine(`COD PAYABLE: Tk. ${order.totalAmount}`);
  pushBytes(0x1d, 0x21, 0x00);
  pushBytes(0x1b, 0x45, 0x00);

  // Universal Code39 Form-A barcode (0x04 ... NUL) supported by virtually all 58mm ESC/POS printers
  const rawCode = toAsciiSafe(order.steadfastConsignmentId || order.invoice)
    .toUpperCase()
    .replace(/[^A-Z0-9-]/g, '')
    .slice(0, 14);

  if (rawCode.length > 0) {
    pushBytes(0x1b, 0x61, 0x01); // Center
    pushBytes(0x1d, 0x48, 0x02); // HRI below barcode
    pushBytes(0x1d, 0x68, 48); // Height 48 dots
    pushBytes(0x1d, 0x77, 2); // Module width 2
    const bcBytes = encoder.encode(rawCode);
    pushBytes(0x1d, 0x6b, 0x04, ...bcBytes, 0x00);
  }

  pushLine('');
  pushBytes(0x1b, 0x61, 0x01);
  pushLine('Thank you for shopping with Inaya');
  pushBytes(0x1b, 0x61, 0x00);

  // Feed 5 lines cleanly past tear bar
  pushBytes(0x1b, 0x64, 0x05);

  return new Uint8Array(chunks);
}

async function writeChunkWebBle(char: BluetoothGATTCharacteristicLike, slice: Uint8Array): Promise<void> {
  const payload = new Uint8Array(slice).buffer as ArrayBuffer;
  if (char.properties.writeWithoutResponse && char.writeValueWithoutResponse) {
    try {
      await char.writeValueWithoutResponse(payload);
      return;
    } catch {
      // Fall through to writeValueWithResponse / writeValue
    }
  }
  if (char.writeValueWithResponse) {
    await char.writeValueWithResponse(payload);
    return;
  }
  await char.writeValue(payload);
}

function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

export async function printOrderToBluetoothThermal(order: Order): Promise<void> {
  const data = buildEscPosLabelBytes(order);
  // 20-byte chunks fit default BLE 4.0 ATT MTU (23 - 3 = 20 bytes) across ALL cheap 58mm thermal printers
  const CHUNK_SIZE = 20;

  // Capacitor APK BLE Path
  if (capConnected) {
    const capBle = getCapacitorBle();
    if (!capBle) throw new Error('Capacitor Bluetooth LE plugin unavailable.');
    for (let i = 0; i < data.length; i += CHUNK_SIZE) {
      const hex = bytesToHex(data.slice(i, i + CHUNK_SIZE));
      if (capConnected.useWriteWithoutResponse && capBle.writeWithoutResponse) {
        await capBle.writeWithoutResponse({
          deviceId: capConnected.deviceId,
          service: capConnected.service,
          characteristic: capConnected.characteristic,
          value: hex,
        });
      } else if (capBle.write) {
        await capBle.write({
          deviceId: capConnected.deviceId,
          service: capConnected.service,
          characteristic: capConnected.characteristic,
          value: hex,
        });
      }
      await new Promise((r) => setTimeout(r, 28));
    }
    return;
  }

  // Web Bluetooth Path (auto-reconnect if printer dropped idle BLE connection)
  if (!connectedDevice?.gatt) {
    throw new Error('Bluetooth thermal printer is not connected.');
  }

  if (!connectedDevice.gatt.connected || !writableCharacteristic) {
    const server = await connectedDevice.gatt.connect();
    const resolved = await resolveBestWebBleCharacteristic(server);
    writableCharacteristic = resolved.char;
    connectedServiceUuid = resolved.serviceUuid;
    connectedCharUuid = resolved.char.uuid;
  }

  const char = writableCharacteristic;
  for (let i = 0; i < data.length; i += CHUNK_SIZE) {
    const slice = data.slice(i, i + CHUNK_SIZE);
    await writeChunkWebBle(char, slice);
    await new Promise((r) => setTimeout(r, 28));
  }
}

export async function printTestThermalPage(): Promise<void> {
  const sampleOrder: Order = {
    id: 'test',
    invoice: 'INY-TEST-1001',
    customerName: 'Inaya Test Print',
    customerPhone: '01700000000',
    customerAddress: 'Dhanmondi 27, Dhaka 1209',
    deliveryZone: 'inside_dhaka',
    note: 'Thermal Printer Test',
    items: [
      {
        productId: 'test',
        productName: 'Ribbed Turtleneck Sweater',
        productSlug: 'test',
        image: '',
        size: 'M',
        color: 'Cream',
        price: 1350,
        quantity: 1,
      },
    ],
    subtotal: 1350,
    discountAmount: 0,
    deliveryCharge: 70,
    totalAmount: 1420,
    orderStatus: 'confirmed',
    steadfastConsignmentId: '14982041',
    steadfastTrackingCode: 'SF8849201BD',
    createdAt: new Date().toISOString(),
  };
  await printOrderToBluetoothThermal(sampleOrder);
}

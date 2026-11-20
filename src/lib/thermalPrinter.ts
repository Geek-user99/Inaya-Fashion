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
}

const COMMON_PRINTER_SERVICES = [
  '000018f0-0000-1000-8000-00805f9b34fb',
  '0000ff00-0000-1000-8000-00805f9b34fb',
  '0000ffe0-0000-1000-8000-00805f9b34fb',
  '0000ae30-0000-1000-8000-00805f9b34fb',
  '49535343-fe7d-4ae5-8fa9-9fafd205e455',
  'e7810a71-73ae-499d-8c15-faa9aef0c3f2',
];

let connectedDevice: BluetoothDeviceLike | null = null;
let writableCharacteristic: BluetoothGATTCharacteristicLike | null = null;

export function isWebBluetoothSupported(): boolean {
  return typeof navigator !== 'undefined' && Boolean((navigator as BluetoothNavigator).bluetooth);
}

export function getConnectedPrinterName(): string | null {
  if (connectedDevice?.gatt?.connected && writableCharacteristic) {
    return connectedDevice.name || 'Bluetooth Thermal Printer';
  }
  return null;
}

export async function connectThermalPrinter(): Promise<string> {
  const nav = navigator as BluetoothNavigator;
  if (!nav.bluetooth) {
    throw new Error(
      'Web Bluetooth is not supported in this browser. Use Chrome on Android/Desktop or the Inaya Admin APK, or use System Print.'
    );
  }

  const device = await nav.bluetooth.requestDevice({
    acceptAllDevices: true,
    optionalServices: COMMON_PRINTER_SERVICES,
  });

  if (!device.gatt) {
    throw new Error('Selected Bluetooth device does not support GATT printing.');
  }

  const server = await device.gatt.connect();
  const services = await server.getPrimaryServices();

  let foundChar: BluetoothGATTCharacteristicLike | null = null;
  for (const service of services) {
    try {
      const chars = await service.getCharacteristics();
      for (const ch of chars) {
        if (ch.properties.write || ch.properties.writeWithoutResponse) {
          foundChar = ch;
          break;
        }
      }
      if (foundChar) break;
    } catch {
      // Try next service
    }
  }

  if (!foundChar) {
    throw new Error('No writable print characteristic found on this Bluetooth device.');
  }

  connectedDevice = device;
  writableCharacteristic = foundChar;
  return device.name || 'Mini Thermal Printer';
}

export function disconnectThermalPrinter(): void {
  try {
    connectedDevice?.gatt?.disconnect();
  } catch {
    // ignore
  }
  connectedDevice = null;
  writableCharacteristic = null;
}

function buildEscPosLabelBytes(order: Order): Uint8Array {
  const encoder = new TextEncoder();
  const chunks: number[] = [];

  const pushBytes = (...bytes: number[]) => chunks.push(...bytes);
  const pushText = (txt: string) => {
    const encoded = encoder.encode(txt + '\n');
    chunks.push(...encoded);
  };

  // ESC @ (Initialize printer)
  pushBytes(0x1b, 0x40);
  // Center align
  pushBytes(0x1b, 0x61, 0x01);
  // Bold + double height
  pushBytes(0x1b, 0x21, 0x30);
  pushText('INAYA FASHION');
  // Normal size
  pushBytes(0x1b, 0x21, 0x00);
  pushText('--------------------------------');

  // Left align
  pushBytes(0x1b, 0x61, 0x00);
  pushBytes(0x1b, 0x45, 0x01); // Bold on
  pushText(`INV: ${order.invoice}`);
  if (order.steadfastConsignmentId) {
    pushText(`STEADFAST ID: ${order.steadfastConsignmentId}`);
  }
  if (order.steadfastTrackingCode) {
    pushText(`TRACK: ${order.steadfastTrackingCode}`);
  }
  pushBytes(0x1b, 0x45, 0x00); // Bold off
  pushText('--------------------------------');
  pushText(`TO: ${order.customerName}`);
  pushText(`PH: ${order.customerPhone}`);
  pushText(`ADDR: ${order.customerAddress}`);
  pushText('--------------------------------');
  for (const item of order.items) {
    pushText(`${item.productName.slice(0, 26)}`);
    pushText(`  ${item.size} / ${item.color} x${item.quantity} - Tk.${item.price * item.quantity}`);
  }
  pushText('--------------------------------');
  pushBytes(0x1b, 0x45, 0x01);
  pushText(`COD AMOUNT: Tk. ${order.totalAmount}`);
  pushBytes(0x1b, 0x45, 0x00);

  // Print Code128 / Code39 ESC/POS barcode if Steadfast Consignment ID exists
  const barcodeData = order.steadfastConsignmentId || order.invoice;
  pushBytes(0x1b, 0x61, 0x01); // Center
  pushBytes(0x1d, 0x48, 0x02); // HRI below barcode
  pushBytes(0x1d, 0x68, 56); // Barcode height
  pushBytes(0x1d, 0x77, 2); // Module width
  const bcBytes = encoder.encode(barcodeData);
  pushBytes(0x1d, 0x6b, 0x45, bcBytes.length, ...bcBytes); // Code39

  pushText('');
  pushText('Thank you for shopping with Inaya');
  pushBytes(0x1b, 0x64, 0x04); // Feed 4 lines

  return new Uint8Array(chunks);
}

export async function printOrderToBluetoothThermal(order: Order): Promise<void> {
  if (!writableCharacteristic || !connectedDevice?.gatt?.connected) {
    throw new Error('Bluetooth thermal printer is not connected.');
  }

  const data = buildEscPosLabelBytes(order);
  const chunkSize = 100; // Safe BLE MTU chunk size
  for (let i = 0; i < data.length; i += chunkSize) {
    const slice = data.slice(i, i + chunkSize);
    if (writableCharacteristic.properties.writeWithoutResponse && writableCharacteristic.writeValueWithoutResponse) {
      await writableCharacteristic.writeValueWithoutResponse(slice);
    } else {
      await writableCharacteristic.writeValue(slice);
    }
    await new Promise((r) => setTimeout(r, 25));
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

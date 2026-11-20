export interface SizeOption {
  size: string;
  inStock: boolean;
}

export interface ColorOption {
  name: string;
  hex: string;
  image: string;
  inStock: boolean;
}

export interface Category {
  id: string;
  name: string;
  slug: string;
  description: string;
  displayOrder: number;
}

export interface Product {
  id: string;
  name: string;
  slug: string;
  categoryId: string;
  description: string;
  fabricCare: string;
  price: number;
  compareAtPrice?: number | null;
  images: string[];
  sizes: SizeOption[];
  colors: ColorOption[];
  comingSoon: boolean;
  showOnHomepage: boolean;
  displayOrder: number;
  createdAt: string;
}

export interface Review {
  id: string;
  productId: string;
  reviewerName: string;
  location: string;
  rating: number;
  comment: string;
  verifiedPurchase: boolean;
  createdAt: string;
}

export interface Coupon {
  id: string;
  code: string;
  discountType: 'percentage' | 'fixed';
  discountValue: number;
  minOrderAmount: number;
  active: boolean;
  expiresAt?: string | null;
}

export interface OrderItem {
  productId: string;
  productName: string;
  productSlug: string;
  image: string;
  size: string;
  color: string;
  price: number;
  quantity: number;
}

export type OrderStatus = 'pending' | 'confirmed' | 'shipped' | 'delivered' | 'cancelled';

export interface Order {
  id: string;
  invoice: string;
  customerName: string;
  customerPhone: string;
  customerAddress: string;
  deliveryZone: 'inside_dhaka' | 'outside_dhaka';
  note: string;
  items: OrderItem[];
  subtotal: number;
  discountAmount: number;
  couponCode?: string | null;
  deliveryCharge: number;
  totalAmount: number;
  orderStatus: OrderStatus;
  steadfastConsignmentId?: string | null;
  steadfastTrackingCode?: string | null;
  steadfastStatus?: string | null;
  steadfastSentAt?: string | null;
  createdAt: string;
}

export interface SocialLinks {
  facebook: string;
  instagram: string;
  tiktok: string;
  whatsapp: string;
  youtube: string;
}

export interface PublicSettings {
  storeName: string;
  topbarEnabled: boolean;
  topbarText: string;
  deliveryEnabled: boolean;
  deliveryInsideDhaka: number;
  deliveryOutsideDhaka: number;
  freeDeliveryThreshold: number;
  socialLinks: SocialLinks;
  metaPixelId: string;
}

export interface AdminSettings extends PublicSettings {
  steadfastBaseUrl: string;
  steadfastSandboxMode: boolean;
  hasSteadfastKeys: boolean;
  steadfastApiKeyMasked: string;
  hasMetaCapiToken: boolean;
  metaTestEventCode: string;
  cloudinaryCloudName: string;
  cloudinaryApiKey: string;
  cloudinaryUploadPreset: string;
  hasCloudinarySecret: boolean;
  supabaseConfigured: boolean;
}

export interface CartItem {
  productId: string;
  slug: string;
  name: string;
  image: string;
  price: number;
  size: string;
  color: string;
  quantity: number;
}

export interface StoreDatabase {
  settings: PublicSettings & {
    steadfastBaseUrl: string;
    steadfastApiKey: string;
    steadfastSecretKey: string;
    steadfastSandboxMode: boolean;
    metaCapiToken: string;
    metaTestEventCode: string;
    cloudinaryCloudName: string;
    cloudinaryApiKey: string;
    cloudinaryApiSecret: string;
    cloudinaryUploadPreset: string;
  };
  categories: Category[];
  products: Product[];
  reviews: Review[];
  coupons: Coupon[];
  orders: Order[];
}

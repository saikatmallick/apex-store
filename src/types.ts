export interface UserProfile {
  id: number;
  uid: string;
  email: string;
  role: 'user' | 'admin';
  createdAt: string;
}

export interface Product {
  id: number;
  name: string;
  description: string;
  price: number; // Price in cents
  imageUrl: string;
  category: string;
  stock: number;
  createdAt: string;
}

export interface CartItem {
  product: Product;
  quantity: number;
}

export interface OrderItemDetail {
  id: number;
  orderId: number;
  productId: number;
  quantity: number;
  price: number; // In cents
  product?: {
    name: string;
    imageUrl: string;
    category: string;
  };
}

export interface Order {
  id: number;
  userId: number;
  status: 'pending' | 'processing' | 'completed' | 'shipped' | 'cancelled';
  totalAmount: number; // In cents
  createdAt: string;
  userEmail?: string;
  orderItems?: OrderItemDetail[];
}

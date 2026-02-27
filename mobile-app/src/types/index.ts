export interface User {
  id: string;
  email: string;
  fullName: string;
  fullname?: string;
  phone?: string;
  avatar?: string;
  country?: string;
  city?: string;
  whatsapp?: string;
  role: 'SUPER_ADMIN' | 'ADMIN' | 'MANAGER' | 'USER';
  walletBalance: number;
  isActive: boolean;
  createdAt: string;
}

export interface PostUser {
  id: string;
  fullName?: string;
  fullname?: string;
  name?: string;
  avatarUrl?: string;
  avatar?: string;
  followersCount?: number;
}

export interface Post {
  id: string;
  userId: string;
  videoUrl?: string | null;
  hlsUrl?: string | null;
  imageUrl?: string | null;
  mediaType?: 'video' | 'image' | null;
  duration?: number | null;
  thumbnailUrl?: string | null;
  description?: string | null;
  likesCount: number;
  commentsCount: number;
  sharesCount?: number;
  viewsCount?: number;
  isLiked?: boolean;
  isFollowing?: boolean;
  createdAt: string;
  user: PostUser;
}

export interface Transaction {
  id: string;
  senderId?: string;
  receiverId?: string;
  amount: number;
  type:
    | 'DEPOSIT'
    | 'WITHDRAW'
    | 'TRANSFER'
    | 'TONTINE_PAYMENT'
    | 'TONTINE_PAYOUT'
    | 'PRODUCT_PURCHASE';
  status: 'PENDING' | 'COMPLETED' | 'FAILED' | 'CANCELLED';
  reference: string;
  note?: string;
  createdAt: string;
}

export interface Tontine {
  id: string;
  title: string;
  description?: string;
  contributionAmount: number;
  frequency: 'DAILY' | 'WEEKLY' | 'BIWEEKLY' | 'MONTHLY';
  membersLimit: number;
  status: 'PENDING' | 'ACTIVE' | 'COMPLETED' | 'CANCELLED';
  currentTurn: number;
  currentCycle: number;
  nextPaymentDate?: string;
  createdAt: string;
  owner: Pick<User, 'id' | 'fullName' | 'avatar'>;
  members?: TontineMember[];
  _count?: { members: number };
}

export interface TontineMember {
  id: string;
  tontineId: string;
  userId: string;
  turnOrder: number;
  isPaid: boolean;
  paidAt?: string;
  user: Pick<User, 'id' | 'fullName' | 'avatar'>;
}

export interface Product {
  id: string;
  sellerId: string;
  name: string;
  description: string;
  price: number;
  stock: number;
  images: string[];
  imageUrl?: string;
  status: 'ACTIVE' | 'INACTIVE' | 'OUT_OF_STOCK';
  createdAt: string;
  seller: Pick<User, 'id' | 'fullName' | 'fullname' | 'avatar'> & {
    country?: string;
    city?: string;
    whatsapp?: string;
    phone?: string;
  };
  category?: { id: string; name: string; emoji?: string; slug?: string };
}

export interface Notification {
  id: string;
  userId: string;
  title: string;
  body: string;
  type: string;
  isRead: boolean;
  metadata?: Record<string, unknown>;
  createdAt: string;
}

export interface PaginatedResult<T> {
  data: T[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages?: number;
    hasNextPage?: boolean;
    hasMore?: boolean;
    hasPreviousPage?: boolean;
  };
}

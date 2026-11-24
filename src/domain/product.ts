export interface Rating {
  readonly rate: number;
  readonly count: number;
}

export interface Product {
  readonly id: number;
  readonly title: string;
  readonly price: number;
  readonly description: string;
  readonly category: string;
  readonly imageUrl: string;
  readonly rating: Rating | null;
}

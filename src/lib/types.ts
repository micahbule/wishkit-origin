export interface WishlistItem {
  name: string
  description?: string
  link?: string
  photo?: string
  price?: string
}

export interface Wishlist {
  title: string
  author?: string
  items: WishlistItem[]
}

export interface WishlistItem {
  name: string
  description?: string
  link?: string
  photo?: string
  price?: string
  tags?: string[]
}

export interface Wishlist {
  title: string
  author?: string
  items: WishlistItem[]
}

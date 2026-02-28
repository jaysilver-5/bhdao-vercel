import "express"

declare module "express" {
  interface Request {
    user?: {
      userId: string
      wallet: string
      role: "MEMBER" | "EXPERT" | "ADMIN"
    }
  }
}
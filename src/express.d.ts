declare global {
    namespace Express {
        interface Request {
            user?: {
                role?: "admin" | "teacher" | "student"
            }
        }
    }
}

// security middleware | call before every importent request
export {};
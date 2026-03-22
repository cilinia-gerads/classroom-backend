import type { Request, Response, NextFunction } from "express";
import { aj } from '../config/arcjet.js'
import { slidingWindow, type ArcjetNodeRequest } from "@arcjet/node";

const securityMiddleware = async ( req: Request, res: Response, next: NextFunction ) => {
    if(process.env.NODE_ENV === 'test') return next();

    try {
        const role: RateLimitRole = req.user?.role ?? 'guest';

        let limit: number;
        let message: string;

        switch(role) {
            case 'admin':
                limit=2;
                message='Admin request limit exceeded (20 per minutge)'
                break;
            case 'teacher':
            case 'student':
                limit=10
                message='Admin request limit exceeded (10 per minute). please wait.';
                break;

            default:
                limit=5
                message='Guest request limit exceeded (5 per minute). Please sign up for higher limits.'
                break;
        }

        const client = aj.withRule(
            slidingWindow({
                mode: 'LIVE',
                interval: '1m',
                max: limit,
            })
        )

        const arcjetRequest: ArcjetNodeRequest = {
            headers: req.headers,
            method: req.method,
            url: req.originalUrl ?? req.url,
            socket: { remoteAddress: req.socket.remoteAddress ?? req.ip ?? '0.0.0.0'}
        }

        const decition = await client.protect(arcjetRequest);

        if(decition.isDenied() && decition.reason.isBot()) {
            return res.status(403).json({ error: 'Forbidden', message: 'Automated requests are not allowed.' })
        }

        if(decition.isDenied() && decition.reason.isShield()) {
            return res.status(403).json({ error: 'Forbidden', message: 'Request blocked by security policy.' })
        }

        if(decition.isDenied() && decition.reason.isRateLimit()) {
            return res.status(429).json({ error: 'Too many requests', message })
        }

        next()

    } catch(error) {
        console.log('Arcjet middleware are error : ', error)
        res.status(500).json({ error: 'Internal error', message: 'Something went wrong with security middleware'})
    }
}

export default securityMiddleware;
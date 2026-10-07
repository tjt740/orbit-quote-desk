import { env } from 'cloudflare:workers';
export function storage(){if(!env.DB)throw new Error('Database unavailable');return env.DB;}

export function images(){if(!env.BUCKET)throw new Error('Image storage unavailable');return env.BUCKET;}

import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import db from '../db/database';

const JWT_SECRET = process.env.JWT_SECRET ?? 'dev-secret-change-in-production';

export interface AuthPayload {
  id: number;
  email: string;
  role: string;
}

// Extend Express Request to carry the authenticated user
declare global {
  namespace Express {
    interface Request {
      user?: AuthPayload;
    }
  }
}

export function requireAuth(req: Request, res: Response, next: NextFunction) {
  const token = req.cookies?.bt_token;
  if (!token) {
    res.status(401).json({ error: 'Authentication required' });
    return;
  }
  try {
    req.user = jwt.verify(token, JWT_SECRET) as AuthPayload;
    next();
  } catch {
    res.status(401).json({ error: 'Invalid or expired token' });
  }
}

export function requireAdmin(req: Request, res: Response, next: NextFunction) {
  if (req.user?.role !== 'admin') {
    res.status(403).json({ error: 'Admin access required' });
    return;
  }
  next();
}

export function requireProjectMember(req: Request, res: Response, next: NextFunction) {
  // Admins are always allowed
  if (req.user?.role === 'admin') {
    next();
    return;
  }

  // Resolve project_id from body (POST) or from the existing bug row (PUT)
  let projectId: number | undefined = req.body?.project_id;

  if (!projectId && req.params.id) {
    const bug = db.prepare('SELECT project_id FROM bugs WHERE id = ?').get(req.params.id) as { project_id: number } | undefined;
    if (!bug) {
      res.status(404).json({ error: 'Bug not found' });
      return;
    }
    projectId = bug.project_id;
  }

  if (!projectId) {
    res.status(400).json({ error: 'project_id is required' });
    return;
  }

  const member = db.prepare('SELECT 1 FROM project_members WHERE project_id = ? AND user_id = ?').get(projectId, req.user!.id);
  if (!member) {
    res.status(403).json({ error: 'You are not a member of this project' });
    return;
  }

  next();
}

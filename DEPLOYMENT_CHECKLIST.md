# Vercel + PlanetScale Deployment Checklist

## Pre-deployment:
- [ ] Code pushed to GitHub
- [ ] PlanetScale account created
- [ ] PlanetScale database created
- [ ] Database connection string obtained
- [ ] Vercel account created

## Deployment:
- [ ] Import GitHub repo to Vercel
- [ ] Set environment variables in Vercel:
  - [ ] DATABASE_URL (from PlanetScale)
  - [ ] SESSION_SECRET (random secure string)
  - [ ] NODE_ENV=production
- [ ] Deploy project
- [ ] Test admin login (admin/admin123)
- [ ] Change default admin credentials
- [ ] Test database persistence

## Post-deployment:
- [ ] Custom domain configured (optional)
- [ ] SSL certificate verified
- [ ] Performance monitoring set up
- [ ] Backup strategy implemented

## Environment Variables for Vercel:
```
DATABASE_URL=mysql://your-planetscale-connection-string
SESSION_SECRET=your-super-secure-random-string
NODE_ENV=production
```

## Quick Links:
- Vercel Dashboard: https://vercel.com/dashboard
- PlanetScale Dashboard: https://app.planetscale.com
- Deployment Guide: ./VERCEL_PLANETSCALE_GUIDE.md

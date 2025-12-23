# QSights VIBE - Quick Start Guide

## What is This?

This repository contains a complete backup of a **WORKING** QSights production configuration from December 23, 2025.

## Files Included

- `README.md` - Complete checkpoint documentation
- `qsights-vibe-backup.sh` - Automated restoration script
- `qsights-vibe-complete-backup.md` - Single-file backup (all configs)

## Quick Access

**Production Dashboard**: http://prod.qsights.com  
**Login**: superadmin@qsights.com / admin123  
**Server**: EC2 i-021cba87abb7fc764 (65.0.100.121)

## Restoration

If production breaks, refer to `README.md` for complete restoration instructions.

Or run:
```bash
./qsights-vibe-backup.sh
```

## Verified Working

✅ Dashboard loads  
✅ Login authentication  
✅ Organizations API (BioQuest visible)  
✅ All API endpoints  
✅ CSRF & Session management  
✅ Database (5 users, 38 tables)

**Status**: Tested and working as of December 23, 2025

#!/bin/bash

echo "🎓 Attendance System - Daily Database Tasks"
echo

while true; do
    echo "Choose what you want to do:"
    echo
    echo "1) Check database status"
    echo "2) Update database"
    echo "3) Create backup"
    echo "4) Sync to production (online)"
    echo "5) Sync from production (get latest data)"
    echo "6) View backups"
    echo "7) Health check"
    echo "8) Start automated management"
    echo "9) Maintenance (weekly/monthly)"
    echo "0) Exit"
    echo

    read -p "Enter your choice (0-9): " choice

    case $choice in
        1)
            echo "📊 Checking database status..."
            node db-manager.js status
            echo
            read -p "Press Enter to continue..."
            ;;
        2)
            echo "🔄 Updating database..."
            node db-manager.js update
            echo
            read -p "Press Enter to continue..."
            ;;
        3)
            echo "💾 Creating backup..."
            node backup-system.js create manual
            echo
            read -p "Press Enter to continue..."
            ;;
        4)
            echo "🌐 Syncing to production..."
            echo "⚠️  This will upload your local data to production"
            read -p "Are you sure? (y/n): " confirm
            if [[ $confirm == [yY] ]]; then
                node db-manager.js sync to-production
            else
                echo "Cancelled."
            fi
            echo
            read -p "Press Enter to continue..."
            ;;
        5)
            echo "🌐 Syncing from production..."
            echo "⚠️  This will download production data to local"
            read -p "Are you sure? (y/n): " confirm
            if [[ $confirm == [yY] ]]; then
                node db-manager.js sync from-production
            else
                echo "Cancelled."
            fi
            echo
            read -p "Press Enter to continue..."
            ;;
        6)
            echo "💾 Your backups:"
            node backup-system.js list
            echo
            node backup-system.js stats
            echo
            read -p "Press Enter to continue..."
            ;;
        7)
            echo "🔍 Running health check..."
            node db-monitor.js check
            echo
            read -p "Press Enter to continue..."
            ;;
        8)
            echo "⚡ Starting automated management..."
            echo "This will run in the background and monitor your database."
            echo "Press Ctrl+C to stop when needed."
            echo
            node db-manager.js auto 60
            read -p "Press Enter to continue..."
            ;;
        9)
            echo "🛠️ Running maintenance..."
            echo "This includes optimization, cleanup, and health checks."
            node db-manager.js maintenance
            echo
            read -p "Press Enter to continue..."
            ;;
        0)
            echo "👋 Goodbye!"
            exit 0
            ;;
        *)
            echo "❌ Invalid choice. Please try again."
            echo
            read -p "Press Enter to continue..."
            ;;
    esac
done
import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, useContext, useEffect, useState } from 'react';
import { apiService } from '../services/api';
import { useAuth } from './AuthContext';

interface NotificationContextType {
    unreadCount: number;
    markAsRead: () => Promise<void>;
    refreshNotifications: () => Promise<void>;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export const useNotifications = () => {
    const context = useContext(NotificationContext);
    if (!context) {
        throw new Error('useNotifications must be used within a NotificationProvider');
    }
    return context;
};

export const NotificationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const { token, user } = useAuth();
    const [unreadCount, setUnreadCount] = useState(0);
    const [lastReadTime, setLastReadTime] = useState<number>(0);

    useEffect(() => {
        loadLastReadTime();
    }, []);

    useEffect(() => {
        if (token && user) {
            refreshNotifications();
            // Poll every minute
            const interval = setInterval(refreshNotifications, 60000);
            return () => clearInterval(interval);
        }
    }, [token, user, lastReadTime]);

    const loadLastReadTime = async () => {
        try {
            const time = await AsyncStorage.getItem('last_notification_read_time');
            if (time) {
                setLastReadTime(parseInt(time, 10));
            }
        } catch (error) {
            console.error('Failed to load last read time', error);
        }
    };

    const markAsRead = async () => {
        try {
            const now = Date.now();
            setLastReadTime(now);
            await AsyncStorage.setItem('last_notification_read_time', now.toString());
            setUnreadCount(0);
        } catch (error) {
            console.error('Failed to mark as read', error);
        }
    };

    const refreshNotifications = async () => {
        if (!token || !user) return;

        try {
            if (user.userType === 'customer') {
                const assignmentsPromise = apiService.getMyAssignments(token, {
                    status: 'pending',
                    limit: 100,
                });
                const notificationsPromise = apiService.getNotifications(token, { limit: 100 });

                const [assignmentsRes, notificationsRes] = await Promise.all([assignmentsPromise, notificationsPromise]);

                const pendingCount = (assignmentsRes.assignments || []).length;

                // For regular notifications, check lastReadTime
                const unreadNotifsCount = (notificationsRes.notifications || []).filter((n: any) => {
                    const created = new Date(n.createdAt).getTime();
                    // We only care about reminders here since assignments are counted separately
                    const type = n.payload?.type || n.type;
                    const isReminder = type === 'manual_reminder' || type === 'event_reminder';
                    return isReminder && created > lastReadTime;
                }).length;

                setUnreadCount(pendingCount + unreadNotifsCount);

            } else if (user.userType === 'vendor') {
                // For vendors, count new accepted/rejected notifications since last read
                const response = await apiService.getNotifications(token, { limit: 100 });
                const filtered = (response.notifications || []).filter((notif: any) => {
                    const type = notif.payload?.type || notif.type;
                    return type === 'event_assignment_accepted' || type === 'event_assignment_rejected';
                });

                const newCount = filtered.filter((n: any) => {
                    const created = new Date(n.createdAt).getTime();
                    return created > lastReadTime;
                }).length;

                setUnreadCount(newCount);
            }
        } catch (error) {
            console.error('Failed to refresh notifications', error);
        }
    };

    return (
        <NotificationContext.Provider value={{ unreadCount, markAsRead, refreshNotifications }}>
            {children}
        </NotificationContext.Provider>
    );
};

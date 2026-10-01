import { useEffect, useRef } from 'react';
import type { TodoItem } from '../types';

export function useTodoNotifications(
  todos: TodoItem[],
  setTodos: React.Dispatch<React.SetStateAction<TodoItem[]>>
) {
  const isFirstRender = useRef(true);

  useEffect(() => {
    // Request permission on mount
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }, []);

  useEffect(() => {
    // We only want to notify if the app is actually open and running the interval
    if (!('Notification' in window) || Notification.permission !== 'granted') {
      return;
    }

    const checkAndNotify = () => {
      const now = new Date();
      // Current date string in local YYYY-MM-DD
      const currentDateStr = now.toLocaleDateString('sv-SE'); // sv-SE gives YYYY-MM-DD
      // Current time string HH:mm
      const currentHours = now.getHours().toString().padStart(2, '0');
      const currentMinutes = now.getMinutes().toString().padStart(2, '0');
      const currentTimeStr = `${currentHours}:${currentMinutes}`;

      let hasModifications = false;
      const updatedTodos = todos.map((todo) => {
        if (
          !todo.completed &&
          !todo.notificationSent &&
          todo.dueDate === currentDateStr &&
          todo.dueTime &&
          todo.dueTime <= currentTimeStr
        ) {
          // Time has come (or passed today) for this task!

          try {
            // Attempt to use service worker registration if available for better mobile support
            navigator.serviceWorker.ready.then((registration) => {
              registration.showNotification('Tâche / Rappel : ' + todo.title, {
                body: todo.clientName ? `Client: ${todo.clientName}` : 'Il est l\'heure pour cette tâche.',
                icon: '/favicon.svg',
                tag: `todo-${todo.id}`,
                requireInteraction: true
              });
            }).catch(() => {
              // Fallback to standard web notification
              new Notification('Tâche / Rappel : ' + todo.title, {
                body: todo.clientName ? `Client: ${todo.clientName}` : 'Il est l\'heure pour cette tâche.',
                icon: '/favicon.svg',
                tag: `todo-${todo.id}`
              });
            });
          } catch (e) {
            // Fallback for older browsers
            new Notification('Tâche / Rappel : ' + todo.title, {
              body: todo.clientName ? `Client: ${todo.clientName}` : 'Il est l\'heure pour cette tâche.',
              icon: '/favicon.svg',
              tag: `todo-${todo.id}`
            });
          }

          hasModifications = true;
          return { ...todo, notificationSent: true };
        }
        return todo;
      });

      if (hasModifications) {
        setTodos(updatedTodos);
      }
    };

    // Run the check every 30 seconds
    const interval = setInterval(checkAndNotify, 30000);

    // Also run a check immediately on mount/update (but delay it slightly so it doesn't block render)
    // Only if it's not the first render to prevent weird hydration flashes
    if (!isFirstRender.current) {
        setTimeout(checkAndNotify, 2000);
    }
    isFirstRender.current = false;

    return () => clearInterval(interval);
  }, [todos, setTodos]);
}

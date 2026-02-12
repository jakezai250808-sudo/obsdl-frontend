import { createRouter, createWebHistory } from 'vue-router';

import AppLayout from '@/layouts/AppLayout.vue';
import AccountsView from '@/views/AccountsView.vue';
import TaskDetailView from '@/views/TaskDetailView.vue';
import TasksView from '@/views/TasksView.vue';

const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: '/',
      component: AppLayout,
      children: [
        { path: '', redirect: '/accounts' },
        { path: 'accounts', component: AccountsView },
        { path: 'tasks', component: TasksView },
        { path: 'tasks/:id', component: TaskDetailView, props: true },
      ],
    },
  ],
});

export default router;

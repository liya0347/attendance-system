import { createApp } from 'vue';
import ElementPlus from 'element-plus';
import 'element-plus/dist/index.css';
import './style.css';
import App from './App.vue';
import { useStorage } from '@/composables/useStorage';

const { initData } = useStorage();
initData();

const app = createApp(App);

app.use(ElementPlus);

app.mount('#app');

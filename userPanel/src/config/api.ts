import axios from 'axios';

// export const API_BASE_URL = "http://localhost:3001";
// export const API_BASE_URL = "http://88.222.214.119:3001";
export const API_BASE_URL = "https://qcg80mr4-3001.inc1.devtunnels.ms/api";
// export const API_BASE_URL = "https://askape.apeitnow.com/api";

const api = axios.create({
    baseURL: API_BASE_URL,
    headers: {
        'Content-Type': 'application/json',
    },
});

export default api;

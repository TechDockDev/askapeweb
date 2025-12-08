import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import AdminLayout from './layouts/AdminLayout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Plans from './pages/Plans';
import Users from './pages/Users';

function App() {
  const isAuthenticated = !!localStorage.getItem('adminToken');

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />

        <Route path="/" element={
          // isAuthenticated ? 
          <AdminLayout /> 
          // :
          //  <Navigate to="/login" />}
        }>
          <Route index element={<Navigate to="/dashboard" />} />
          <Route path="dashboard" element={<Dashboard />} />
          <Route path="users" element={<Users />} />
          <Route path="plans" element={<Plans />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;

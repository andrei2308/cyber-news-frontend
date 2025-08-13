import { createBrowserRouter } from 'react-router-dom';
import Login from '../pages/Login';
import ProtectedRoute from '../components/common/ProtectedRoute';

export const router = createBrowserRouter([
    {
        path: '/',
        children: [
            { index: true, element: <Login /> },
            {
                path: 'dashboard',
                element: (
                    <ProtectedRoute>
                        <div>Dashboard Content</div>
                    </ProtectedRoute>
                ),
            },
        ],
    },
]);
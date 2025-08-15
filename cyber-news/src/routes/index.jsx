import { createBrowserRouter } from 'react-router-dom';
import Login from '../pages/Login';
import Feed from '../pages/Feed';
import ProtectedRoute from '../components/common/ProtectedRoute';

export const router = createBrowserRouter([
    {
        path: '/',
        children: [
            { index: true, element: <Login /> },
            {
                path: 'feed',
                element: (
                    <ProtectedRoute>
                        <Feed />
                    </ProtectedRoute>
                ),
            },
        ],
    },
]);
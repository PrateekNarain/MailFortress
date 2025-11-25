import React from 'react';
import { Loader2 } from 'lucide-react';

const Loading = () => (
    <div className="flex items-center justify-center h-screen w-full bg-gray-50">
        <Loader2 className="w-10 h-10 text-blue-600 animate-spin" />
    </div>
);

export default Loading;

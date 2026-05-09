import React from 'react';
import { useNavigate } from 'react-router-dom';
import { LayoutDashboard } from 'lucide-react';
import DataHarvester from '../components/admin/DataHarvester';
import { Button } from '@/components/ui/button';

export default function AlocHarvesterPage() {
  const navigate = useNavigate();
  return (
    <div className="min-h-screen bg-black relative">
      <div className="absolute top-4 left-4 z-50">
        <Button 
          variant="outline" 
          size="sm"
          onClick={() => navigate('/')}
          className="bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-white flex items-center gap-2"
        >
          <LayoutDashboard className="w-4 h-4" /> HQ
        </Button>
      </div>
      <DataHarvester />
    </div>
  );
}

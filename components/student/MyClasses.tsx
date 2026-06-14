import React, { useState, useEffect } from 'react';
import { supabase } from '../../services/supabaseClient';
import type { Class } from '../../types/database';
import { Users, LogIn, Loader2, Trash2, AlertCircle } from 'lucide-react';

interface ClassRow extends Class {
  teacher_name: string | null;
}

interface Props {
  userId: string;
}

const MyClasses: React.FC<Props> = ({ userId }) => {
  const [classes, setClasses]       = useState<ClassRow[]>([]);
  const [inviteCode, setInviteCode] = useState('');
  const [loading, setLoading]       = useState(true);
  const [joining, setJoining]       = useState(false);
  const [error, setError]           = useState<string | null>(null);

  useEffect(() => { load(); }, [userId]);

  const load = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('class_memberships')
      .select('class_id, classes(*, profiles(display_name))')
      .eq('student_id', userId);

    setClasses(
      (data ?? []).map((row: any) => ({
        ...row.classes,
        teacher_name: row.classes?.profiles?.display_name ?? null,
      }))
    );
    setLoading(false);
  };

  const joinClass = async () => {
    const code = inviteCode.trim().toLowerCase();
    if (!code) return;
    setError(null);
    setJoining(true);

    const { error: joinErr } = await supabase.rpc('join_class_by_invite_code', {
      p_invite_code: code,
    });

    setJoining(false);
    if (joinErr) {
      if (joinErr.message.includes('already_member')) {
        setError('You are already in this class.');
      } else if (joinErr.message.includes('invalid_invite_code')) {
        setError('Invalid invite code. Double-check with your teacher.');
      } else {
        setError('Could not join. Try again.');
      }
    } else {
      setInviteCode('');
      load();
    }
  };

  const leaveClass = async (classId: string) => {
    await supabase
      .from('class_memberships')
      .delete()
      .eq('class_id', classId)
      .eq('student_id', userId);
    setClasses(prev => prev.filter(c => c.id !== classId));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="w-6 h-6 text-indigo-400 animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Join form */}
      <div className="bg-slate-800 border border-slate-700 rounded-2xl p-5 flex flex-col gap-3">
        <p className="text-sm font-semibold text-slate-200">Join a Class</p>
        <p className="text-xs text-slate-500">Ask your teacher for the 8-character invite code.</p>
        <div className="flex gap-2">
          <input
            type="text"
            value={inviteCode}
            onChange={e => { setInviteCode(e.target.value); setError(null); }}
            onKeyDown={e => { if (e.key === 'Enter') joinClass(); }}
            placeholder="e.g. a1b2c3d4"
            maxLength={8}
            className="flex-1 bg-slate-900 border border-slate-700 focus:border-indigo-500 rounded-xl px-4 py-2.5 text-sm text-slate-100 placeholder:text-slate-500 outline-none transition-colors font-mono tracking-wider"
          />
          <button
            onClick={joinClass}
            disabled={joining || !inviteCode.trim()}
            className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-xl text-sm font-semibold transition-all"
          >
            {joining ? <Loader2 className="w-4 h-4 animate-spin" /> : <LogIn className="w-4 h-4" />}
            Join
          </button>
        </div>
        {error && (
          <div className="flex items-center gap-2 text-red-400 text-xs">
            <AlertCircle className="w-4 h-4 shrink-0" />
            {error}
          </div>
        )}
      </div>

      {classes.length === 0 ? (
        <div className="text-center py-12 text-slate-500">
          <Users className="w-10 h-10 mx-auto mb-3 text-slate-700" />
          <p className="text-sm">You are not in any classes yet.</p>
        </div>
      ) : (
        classes.map(cls => (
          <div key={cls.id} className="bg-slate-800 border border-slate-700 rounded-2xl px-5 py-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-indigo-600/20 rounded-lg">
                <Users className="w-4 h-4 text-indigo-400" />
              </div>
              <div>
                <p className="font-semibold text-slate-100">{cls.name}</p>
                {cls.teacher_name && (
                  <p className="text-xs text-slate-500">Teacher: {cls.teacher_name}</p>
                )}
              </div>
            </div>
            <button
              onClick={() => leaveClass(cls.id)}
              className="p-2 text-slate-500 hover:text-red-400 hover:bg-red-400/10 rounded-lg transition-colors"
              title="Leave class"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        ))
      )}
    </div>
  );
};

export default MyClasses;

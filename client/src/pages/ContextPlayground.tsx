import React, { useState } from 'react';
import { DndContext, DragOverlay, useDraggable, DragEndEvent, DragStartEvent, closestCenter } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy, useSortable, arrayMove } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { nanoid } from 'nanoid';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, User, Bot, Trash2, Info, ArrowDown, Plus } from 'lucide-react';
import { cn } from '@/lib/utils';

// Types
type BlockType = 'user' | 'assistant' | 'system';

interface MessageBlock {
  id: string;
  type: BlockType;
  content: string;
  tokens: number;
}

// Initial Data
const INITIAL_BLOCKS: MessageBlock[] = [
  { id: 'system-1', type: 'system', content: 'You are a helpful AI assistant.', tokens: 7 },
];

// --- Draggable Source Component ---
function SourceBlock({ type }: { type: BlockType }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `source-${type}`,
    data: { type, isSource: true },
  });

  const styles = {
    user: 'bg-blue-100 text-blue-800 border-blue-200 hover:bg-blue-50',
    assistant: 'bg-teal-100 text-teal-800 border-teal-200 hover:bg-teal-50',
    system: 'bg-purple-100 text-purple-800 border-purple-200 hover:bg-purple-50',
  };

  const icons = {
    user: <User className="w-4 h-4" />,
    assistant: <Bot className="w-4 h-4" />,
    system: <Sparkles className="w-4 h-4" />,
  };

  const labels = {
    user: 'User Input',
    assistant: 'AI Response',
    system: 'System Prompt',
  };

  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      className={cn(
        "flex items-center gap-3 p-4 rounded-xl border-2 cursor-grab active:cursor-grabbing transition-all shadow-sm",
        styles[type],
        isDragging ? "opacity-50" : "opacity-100"
      )}
    >
      <div className="p-2 bg-white/50 rounded-lg">
        {icons[type]}
      </div>
      <span className="font-semibold font-heading">{labels[type]}</span>
    </div>
  );
}

// --- Sortable Item Component ---
function SortableMessage({ message, onDelete }: { message: MessageBlock; onDelete: (id: string) => void }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: message.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const styles = {
    user: 'bg-blue-50 border-blue-200',
    assistant: 'bg-teal-50 border-teal-200',
    system: 'bg-purple-50 border-purple-200',
  };

  const icons = {
    user: <User className="w-4 h-4 text-blue-600" />,
    assistant: <Bot className="w-4 h-4 text-teal-600" />,
    system: <Sparkles className="w-4 h-4 text-purple-600" />,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      className={cn(
        "relative group flex flex-col gap-2 p-4 rounded-xl border-2 shadow-sm bg-white transition-all",
        styles[message.type],
        isDragging ? "z-50 shadow-xl scale-105 rotate-1" : "z-0"
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between" {...listeners}>
        <div className="flex items-center gap-2">
          <div className={cn("p-1.5 rounded-md bg-white shadow-sm")}>
            {icons[message.type]}
          </div>
          <span className="text-xs font-bold uppercase tracking-wider opacity-60 font-heading">
            {message.type}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs font-mono text-muted-foreground bg-white/50 px-2 py-1 rounded-md">
            {message.tokens} tokens
          </span>
          <button 
            onClick={() => onDelete(message.id)}
            className="opacity-0 group-hover:opacity-100 p-1.5 hover:bg-red-100 hover:text-red-600 rounded-md transition-all"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="pl-11 pr-4">
        <p className="text-sm leading-relaxed font-medium text-foreground/80">
          {message.content}
        </p>
      </div>
      
      {/* Connector Line (Visual) */}
      <div className="absolute -bottom-6 left-6 w-0.5 h-6 bg-border -z-10 last:hidden" />
    </div>
  );
}

// --- Main Page Component ---
export default function ContextPlayground() {
  const [messages, setMessages] = useState<MessageBlock[]>(INITIAL_BLOCKS);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [draggedType, setDraggedType] = useState<BlockType | null>(null);

  // Calculate Stats
  const totalTokens = messages.reduce((acc, msg) => acc + msg.tokens, 0);
  const maxContext = 4096;
  const usagePercent = (totalTokens / maxContext) * 100;

  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event;
    setActiveId(active.id as string);
    
    if (active.data.current?.isSource) {
      setDraggedType(active.data.current.type);
    }
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);
    setDraggedType(null);

    if (!over) return;

    // Handle dropping source block
    if (active.data.current?.isSource) {
      const type = active.data.current.type as BlockType;
      const newBlock: MessageBlock = {
        id: nanoid(),
        type,
        content: type === 'user' 
          ? 'Can you explain quantum computing simply?' 
          : type === 'assistant' 
          ? 'Quantum computing uses quantum bits or qubits...'
          : 'You are an expert in physics.',
        tokens: Math.floor(Math.random() * 20) + 5,
      };

      setMessages((items) => [...items, newBlock]);
      return;
    }

    // Handle reordering
    if (active.id !== over.id) {
      setMessages((items) => {
        const oldIndex = items.findIndex((i) => i.id === active.id);
        const newIndex = items.findIndex((i) => i.id === over.id);
        return arrayMove(items, oldIndex, newIndex);
      });
    }
  };

  const handleDelete = (id: string) => {
    setMessages(messages.filter(m => m.id !== id));
  };

  return (
    <DndContext 
      collisionDetection={closestCenter}
      onDragStart={handleDragStart} 
      onDragEnd={handleDragEnd}
    >
      <div className="min-h-screen bg-[#f8fafc] p-8 font-sans text-slate-900">
        <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          {/* Header */}
          <div className="lg:col-span-12 mb-4 flex justify-between items-end">
            <div>
              <h1 className="text-4xl font-heading font-bold text-slate-900 mb-2">Context Visualizer</h1>
              <p className="text-lg text-slate-500 max-w-2xl">
                Drag blocks from the left to build the conversation context. See how the AI's memory grows with each interaction.
              </p>
            </div>
            <button 
              onClick={() => setMessages(INITIAL_BLOCKS)}
              className="px-4 py-2 bg-white border border-slate-200 text-slate-600 rounded-lg text-sm font-semibold hover:bg-slate-50 hover:text-slate-900 transition-colors"
            >
              Reset Conversation
            </button>
          </div>

          {/* Left Sidebar - Palette */}
          <div className="lg:col-span-3 space-y-6">
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 sticky top-8">
              <h2 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-4 flex items-center gap-2">
                <Plus className="w-4 h-4" /> Add Blocks
              </h2>
              
              <div className="space-y-3">
                <SourceBlock type="user" />
                <SourceBlock type="assistant" />
                <SourceBlock type="system" />
              </div>
              
              <div className="mt-8 p-4 bg-slate-50 rounded-xl border border-slate-100 text-sm text-slate-600">
                <div className="flex items-start gap-2">
                  <Info className="w-4 h-4 mt-0.5 text-slate-400" />
                  <p>
                    <strong>How it works:</strong><br/>
                    The AI reads the entire stack from top to bottom every time it generates a new response.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Main Area - Context Window */}
          <div className="lg:col-span-6">
            <div className="bg-white rounded-3xl shadow-lg border border-slate-100 min-h-[600px] flex flex-col overflow-hidden">
              
              {/* Window Header */}
              <div className="p-4 border-b bg-slate-50/50 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="flex gap-1.5">
                    <div className="w-3 h-3 rounded-full bg-red-400/30" />
                    <div className="w-3 h-3 rounded-full bg-yellow-400/30" />
                    <div className="w-3 h-3 rounded-full bg-green-400/30" />
                  </div>
                  <span className="text-sm font-medium text-slate-400 ml-2">context_window.json</span>
                </div>
                <span className="text-xs font-bold text-slate-300 uppercase">Read Direction <ArrowDown className="inline w-3 h-3" /></span>
              </div>

              {/* Scrollable Area */}
              <div className="flex-1 p-6 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] bg-fixed">
                <SortableContext 
                  items={messages}
                  strategy={verticalListSortingStrategy}
                >
                  <div className="space-y-4 pb-20">
                    <AnimatePresence>
                      {messages.map((msg) => (
                        <motion.div
                          key={msg.id}
                          initial={{ opacity: 0, y: 20, scale: 0.95 }}
                          animate={{ opacity: 1, y: 0, scale: 1 }}
                          exit={{ opacity: 0, x: -20 }}
                          transition={{ duration: 0.2 }}
                        >
                          <SortableMessage message={msg} onDelete={handleDelete} />
                        </motion.div>
                      ))}
                    </AnimatePresence>
                    
                    {messages.length === 0 && (
                      <div className="h-40 flex items-center justify-center border-2 border-dashed border-slate-200 rounded-xl text-slate-400">
                        Drag blocks here to start
                      </div>
                    )}
                  </div>
                </SortableContext>
              </div>

              {/* Footer Input Simulation */}
              <div className="p-4 border-t bg-white">
                <div className="h-12 bg-slate-50 rounded-xl border border-slate-100 flex items-center px-4 text-slate-400">
                  <span className="animate-pulse">Waiting for next input...</span>
                </div>
              </div>
            </div>
          </div>

          {/* Right Sidebar - Stats */}
          <div className="lg:col-span-3">
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 sticky top-8 space-y-6">
              <h2 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-4">Context Usage</h2>
              
              <div>
                <div className="flex justify-between text-sm mb-2 font-medium">
                  <span>Tokens Used</span>
                  <span>{totalTokens} / {maxContext}</span>
                </div>
                <div className="h-4 bg-slate-100 rounded-full overflow-hidden">
                  <motion.div 
                    className="h-full bg-primary"
                    initial={{ width: 0 }}
                    animate={{ width: `${Math.max(usagePercent, 2)}%` }}
                    transition={{ type: "spring", stiffness: 100 }}
                  />
                </div>
                <p className="text-xs text-slate-400 mt-2">
                  As you add more blocks, older messages might get "pushed out" if the context limit is reached.
                </p>
              </div>

              <div className="pt-6 border-t border-slate-100">
                <h3 className="text-sm font-bold text-slate-900 mb-2">What is Context?</h3>
                <p className="text-sm text-slate-500 leading-relaxed">
                  LLMs don't have a real memory. They just see the entire conversation history sent to them every time you press send. This history is called "Context."
                </p>
              </div>
            </div>
          </div>

        </div>

        {/* Global Overlay */}
        <DragOverlay>
          {activeId && !draggedType ? (
             <div className="opacity-90 scale-105 shadow-2xl">
               <SortableMessage 
                 message={messages.find(m => m.id === activeId)!} 
                 onDelete={() => {}} 
               />
             </div>
          ) : null}
          {draggedType ? (
             <div className="opacity-90 scale-105 rotate-2 cursor-grabbing">
               <SourceBlock type={draggedType} />
             </div>
          ) : null}
        </DragOverlay>

      </div>
    </DndContext>
  );
}

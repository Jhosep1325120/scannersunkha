// Comentario: Dibuja la tarjeta de sellos y sus recompensas.
'use client'

import { motion, AnimatePresence } from 'framer-motion'
import { Scissors, Gift, Crown } from 'lucide-react'
import { cn } from '@/lib/utils'
import { getBusinessWebsiteUrl } from '@/lib/publicUrl'

interface StampCardProps {
  stamps: number
  businessName: string
  userName: string
  showAnimation?: boolean
}

export function StampCard({ 
  stamps, 
  businessName, 
  userName,
  showAnimation = false 
}: StampCardProps) {
  const totalSlots = 6
  const canRedeem = stamps >= 5
  const businessSlug = 'barberia-sunkha'

  return (
    <div className="relative w-full max-w-md mx-auto">
      {/* Card Container */}
      <div className="relative bg-gradient-to-br from-[#1a1a1a] to-[#0f0f0f] rounded-2xl p-6 border border-amber-500/20 shadow-2xl shadow-amber-500/10 overflow-hidden">
        {/* Background Pattern */}
        <div className="absolute inset-0 opacity-5">
          <div className="absolute inset-0" style={{
            backgroundImage: `repeating-linear-gradient(
              45deg,
              transparent,
              transparent 10px,
              #f59e0b 10px,
              #f59e0b 12px
            )`
          }} />
        </div>

        {/* Header */}
        <div className="relative z-10 text-center mb-6">
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="inline-flex items-center gap-2 mb-2"
          >
            <Crown className="w-5 h-5 text-amber-500" />
            <span className="text-amber-500 text-xs font-bold tracking-widest uppercase">
              Tarjeta de Fidelidad
            </span>
            <Crown className="w-5 h-5 text-amber-500" />
          </motion.div>
          
          <h2 className="text-2xl font-bold text-white mb-1">
            {businessName}
          </h2>
          <p className="text-gray-400 text-sm">
            {userName}
          </p>
        </div>

        {/* Progress Bar */}
        <div className="relative z-10 mb-6">
          <div className="flex justify-between items-center mb-2">
            <span className="text-xs text-gray-400">Progreso</span>
            <span className={cn(
              "text-xs font-bold",
              canRedeem ? "text-amber-400" : "text-gray-400"
            )}>
              {Math.min(stamps, 5)} / 5
            </span>
          </div>
          <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
            <motion.div
              className="h-full bg-gradient-to-r from-amber-600 to-amber-400"
              initial={{ width: 0 }}
              animate={{ width: `${Math.min((stamps / 5) * 100, 100)}%` }}
              transition={{ duration: 0.5, ease: "easeOut" }}
            />
          </div>
        </div>

        {/* Stamp Slots Grid */}
        <div className="relative z-10 grid grid-cols-3 gap-3 mb-4">
          <AnimatePresence>
            {Array.from({ length: totalSlots }).map((_, index) => {
              const isStamped = index < stamps
              const isFreeSlot = index === 5
              const isRedeemable = isFreeSlot && canRedeem

              return (
                <motion.div
                  key={index}
                  initial={showAnimation && index === stamps - 1 ? { scale: 0.5, opacity: 0 } : false}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ 
                    type: "spring",
                    stiffness: 300,
                    damping: 20,
                    delay: index * 0.05
                  }}
                  className={cn(
                    "aspect-square rounded-xl flex items-center justify-center transition-all duration-300",
                    isFreeSlot 
                      ? "bg-gradient-to-br from-amber-500/20 to-amber-600/20 border-2 border-dashed border-amber-500/50"
                      : isStamped
                        ? "bg-gradient-to-br from-amber-500 to-amber-600 border-2 border-amber-400"
                        : "bg-gray-800/50 border-2 border-dashed border-gray-700"
                  )}
                >
                  {isFreeSlot ? (
                    <motion.div
                      animate={isRedeemable ? {
                        scale: [1, 1.1, 1],
                        rotate: [0, -5, 5, 0]
                      } : {}}
                      transition={{
                        duration: 2,
                        repeat: Infinity,
                        repeatDelay: 1
                      }}
                    >
                      <Gift className={cn(
                        "w-8 h-8",
                        isRedeemable ? "text-amber-400" : "text-gray-600"
                      )} />
                    </motion.div>
                  ) : isStamped ? (
                    <motion.div
                      initial={{ scale: 0, rotate: -180 }}
                      animate={{ scale: 1, rotate: 0 }}
                      transition={{ type: "spring", stiffness: 200, delay: index * 0.1 }}
                    >
                      <Scissors className="w-8 h-8 text-gray-900" />
                    </motion.div>
                  ) : (
                    <span className="text-gray-600 font-bold text-lg">
                      {index + 1}
                    </span>
                  )}
                </motion.div>
              )
            })}
          </AnimatePresence>
        </div>

        {/* Status Message */}
        <motion.div 
          className="relative z-10 text-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
        >
          {canRedeem ? (
            <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-3">
              <p className="text-amber-400 font-bold text-sm">
                🎉 ¡CORTE GRATIS DISPONIBLE!
              </p>
              <p className="text-amber-400/70 text-xs mt-1">
                Muestra esta pantalla al barbero para canjear
              </p>
            </div>
          ) : (
            <p className="text-gray-500 text-xs">
              {5 - stamps} corte{5 - stamps !== 1 ? 's' : ''} más para tu corte GRATIS
            </p>
          )}
        </motion.div>

        {/* Decorative Elements */}
        <div className="absolute top-0 left-0 w-20 h-20 bg-amber-500/5 rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-0 w-32 h-32 bg-amber-500/5 rounded-full blur-3xl" />
      </div>
      <button
  onClick={() => {
    window.open(getBusinessWebsiteUrl(businessSlug), '_blank')
  }}
  className="w-full py-3 mt-4 rounded-xl bg-yellow-500 text-black font-bold"
>
  Ver página web
</button>

      {/* Bottom Decoration */}
      <div className="flex justify-center mt-4 gap-1">
        {Array.from({ length: 5 }).map((_, i) => (
          <div
            key={i}
            className="w-1 h-1 rounded-full bg-amber-500/30"
          />
        ))}
      </div>
    </div>
  )
}

// Compact version for mobile/small spaces
export function StampCardCompact({ 
  stamps, 
  businessName, 
  userName 
}: StampCardProps) {
  const canRedeem = stamps >= 5
  const businessSlug = 'barberia-sunkha'

  return (
    <div className="relative w-full max-w-sm mx-auto">
      <div className="bg-gradient-to-br from-[#1a1a1a] to-[#0f0f0f] rounded-xl p-4 border border-amber-500/20">
        {/* Header */}
        <div className="flex justify-between items-start mb-3">
          <div>
            <h3 className="text-white font-bold text-sm">{businessName}</h3>
            <p className="text-gray-500 text-xs">{userName}</p>
          </div>
          {canRedeem && (
            <span className="bg-amber-500 text-gray-900 text-xs font-bold px-2 py-1 rounded-full">
              GRATIS
            </span>
          )}
        </div>

        {/* Progress Dots */}
        <div className="flex items-center gap-2">
          <div className="flex gap-1.5 flex-1">
            {Array.from({ length: 5 }).map((_, index) => (
              <div
                key={index}
                className={cn(
                  "h-8 flex-1 rounded-lg flex items-center justify-center transition-all",
                  index < stamps
                    ? "bg-amber-500"
                    : "bg-gray-800 border border-dashed border-gray-600"
                )}
              >
                {index < stamps && (
                  <Scissors className="w-4 h-4 text-gray-900" />
                )}
              </div>
            ))}
          </div>
          
          {/* Free Slot */}
          <div className={cn(
            "w-10 h-8 rounded-lg flex items-center justify-center border-2",
            canRedeem
              ? "bg-amber-500/20 border-amber-500"
              : "bg-gray-800 border-dashed border-gray-600"
          )}>
            <Gift className={cn(
              "w-4 h-4",
              canRedeem ? "text-amber-400" : "text-gray-600"
            )} />
          </div>
        </div>

        {/* Status */}
        <p className="text-center text-xs text-gray-500 mt-2">
          {canRedeem 
            ? "Corte gratis disponible!" 
            : `${5 - stamps} más para tu gratis`}
        </p>
      </div>

      <button
        onClick={() => {
          window.open(getBusinessWebsiteUrl(businessSlug), '_blank')
        }}
        className="w-full py-3 mt-4 rounded-xl bg-yellow-500 text-black font-bold"
      >
        Visitar sitio web
      </button>
    </div>
  )
}

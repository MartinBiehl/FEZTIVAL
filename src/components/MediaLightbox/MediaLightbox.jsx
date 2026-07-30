import { useEffect } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import useModalDialog from '../../hooks/useModalDialog.js';
import './MediaLightbox.css';

function MediaLightbox({
  items,
  activeIndex,
  onClose,
  onPrevious,
  onNext,
  returnFocusRef,
}) {
  const shouldReduceMotion = useReducedMotion();
  const activeItem = items[activeIndex];
  const { dialogRef, initialFocusRef } = useModalDialog({
    isOpen: true,
    onClose,
    returnFocusRef,
  });

  useEffect(() => {
    function handleArrowKeys(event) {
      if (event.key === 'ArrowLeft') {
        event.preventDefault();
        onPrevious();
      } else if (event.key === 'ArrowRight') {
        event.preventDefault();
        onNext();
      }
    }

    document.addEventListener('keydown', handleArrowKeys);
    return () => document.removeEventListener('keydown', handleArrowKeys);
  }, [onNext, onPrevious]);

  return (
    <div className="media-lightbox">
      <motion.div
        className="media-lightbox__backdrop"
        aria-hidden="true"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: shouldReduceMotion ? 0 : 0.2 }}
        onClick={onClose}
      />

      <motion.div
        ref={dialogRef}
        className="media-lightbox__dialog"
        role="dialog"
        aria-modal="true"
        aria-label="Visualizador de fotos e vídeos"
        tabIndex={-1}
        initial={shouldReduceMotion ? { opacity: 1 } : { opacity: 0, scale: 0.98 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: shouldReduceMotion ? 0 : 0.2 }}
      >
        <button
          ref={initialFocusRef}
          className="media-lightbox__close"
          type="button"
          aria-label="Fechar visualizador"
          onClick={onClose}
        >
          ×
        </button>

        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            className="media-lightbox__media"
            key={activeItem.id}
            initial={shouldReduceMotion ? { opacity: 1 } : { opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, x: -20 }}
            transition={{ duration: shouldReduceMotion ? 0 : 0.18 }}
          >
            <img src={activeItem.src} alt={activeItem.alt} />
            {activeItem.type === 'video' && (
              <span className="media-lightbox__video-mark" aria-hidden="true">▶</span>
            )}
          </motion.div>
        </AnimatePresence>

        {items.length > 1 && (
          <>
            <button
              className="media-lightbox__previous"
              type="button"
              aria-label="Mídia anterior"
              onClick={onPrevious}
            >
              ←
            </button>
            <button
              className="media-lightbox__next"
              type="button"
              aria-label="Próxima mídia"
              onClick={onNext}
            >
              →
            </button>
          </>
        )}
      </motion.div>
    </div>
  );
}

export default MediaLightbox;


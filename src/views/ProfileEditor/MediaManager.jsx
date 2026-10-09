'use client';

import { useState } from 'react';
import { ImageIcon, Plus, X } from 'lucide-react';
import { addArtistPhoto, removeArtistPhoto, setArtistCover } from '../../lib/profileActions.js';
import { MAX_GALLERY_PHOTOS, MediaError, prepareImage } from '../../lib/artistMedia.js';

const ACCEPT = 'image/jpeg,image/png,image/webp';

/*
 * Foto principal e galeria. Fica fora do formulario do perfil: cada envio ou
 * remocao vale na hora, sem depender de "Salvar perfil".
 *
 * O arquivo e reduzido no navegador por prepareImage e enviado a Server
 * Action, que confere, grava e registra no banco de uma vez.
 */
async function uploadImage(file, action) {
  const formData = new FormData();
  formData.set('image', await prepareImage(file), 'foto.jpg');

  let result;
  try {
    result = await action(formData);
  } catch {
    throw new MediaError('O envio da imagem falhou. Tente novamente.');
  }
  if (result?.error) throw new MediaError(result.error);
  return result;
}

function FileButton({ label, multiple = false, disabled, onFiles }) {
  return (
    <label className={`media-manager__button${disabled ? ' is-disabled' : ''}`}>
      <input
        type="file"
        accept={ACCEPT}
        multiple={multiple}
        disabled={disabled}
        onChange={(event) => {
          const files = [...(event.target.files ?? [])];
          // Limpa para que escolher o mesmo arquivo de novo dispare onChange.
          event.target.value = '';
          if (files.length) onFiles(files);
        }}
      />
      {label}
    </label>
  );
}

function MediaManager({ initialCover, initialGallery, onCoverChange }) {
  const [cover, setCoverState] = useState(initialCover || null);
  const [gallery, setGallery] = useState(initialGallery);
  const [busy, setBusy] = useState(null);
  const [message, setMessage] = useState(null);
  const slotsLeft = MAX_GALLERY_PHOTOS - gallery.length;

  /* A previa do editor mostra a foto principal atual. */
  function setCover(url) {
    setCoverState(url);
    onCoverChange?.(url);
  }

  async function run(kind, task) {
    setBusy(kind);
    setMessage(null);
    try {
      await task();
    } catch (error) {
      setMessage({
        type: 'error',
        text: error instanceof MediaError ? error.message : 'Algo deu errado. Tente novamente.',
      });
    } finally {
      setBusy(null);
    }
  }

  function changeCover([file]) {
    run('cover', async () => {
      const { url } = await uploadImage(file, setArtistCover);
      setCover(url);
      setMessage({ type: 'ok', text: 'Foto principal atualizada.' });
    });
  }

  function removeCover() {
    run('cover', async () => {
      const result = await setArtistCover(null);
      if (result?.error) throw new MediaError(result.error);
      setCover(null);
      setMessage({ type: 'ok', text: 'Foto principal removida.' });
    });
  }

  function addPhotos(files) {
    run('gallery', async () => {
      const accepted = files.slice(0, slotsLeft);
      for (const file of accepted) {
        const { photo } = await uploadImage(file, addArtistPhoto);
        setGallery((current) => [...current, photo]);
      }
      setMessage({
        type: 'ok',
        text: accepted.length < files.length
          ? `${accepted.length} foto(s) adicionada(s). A galeria aceita até ${MAX_GALLERY_PHOTOS}.`
          : `${accepted.length} foto(s) adicionada(s).`,
      });
    });
  }

  function removePhoto(id) {
    run(id, async () => {
      const result = await removeArtistPhoto(id);
      if (result?.error) throw new MediaError(result.error);
      setGallery((current) => current.filter((photo) => photo.id !== id));
      setMessage({ type: 'ok', text: 'Foto removida.' });
    });
  }

  return (
    <div className="media-manager" aria-busy={busy !== null}>
      <div className="media-manager__cover">
        <div className="media-manager__cover-preview">
          {cover ? <img src={cover} alt="Foto principal atual" /> : <ImageIcon size={28} aria-hidden="true" />}
        </div>
        <div className="media-manager__actions">
          <h3>Foto principal</h3>
          <p className="editor-hint">Aparece no topo do perfil e no catálogo. Prefira uma foto horizontal.</p>
          <div className="media-manager__buttons">
            <FileButton
              label={busy === 'cover' ? 'Enviando…' : cover ? 'Trocar foto' : 'Enviar foto'}
              disabled={busy !== null}
              onFiles={changeCover}
            />
            {cover && (
              <button className="media-manager__remove" type="button" disabled={busy !== null} onClick={removeCover}>
                Remover
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="media-manager__gallery">
        <div className="media-manager__gallery-head">
          <h3>Galeria</h3>
          <span>{gallery.length} de {MAX_GALLERY_PHOTOS}</span>
        </div>
        <ul>
          {gallery.map((photo, index) => (
            <li key={photo.id}>
              <img src={photo.url} alt={`Foto ${index + 1} da galeria`} loading="lazy" />
              <button
                type="button"
                disabled={busy !== null}
                onClick={() => removePhoto(photo.id)}
                aria-label={`Remover foto ${index + 1} da galeria`}
              >
                {busy === photo.id ? '…' : <X size={16} aria-hidden="true" />}
              </button>
            </li>
          ))}
          {slotsLeft > 0 && (
            <li className="media-manager__add">
              <FileButton
                label={busy === 'gallery' ? 'Enviando…' : <><Plus size={20} aria-hidden="true" />Adicionar fotos</>}
                multiple
                disabled={busy !== null}
                onFiles={addPhotos}
              />
            </li>
          )}
        </ul>
        <p className="editor-hint">
          JPG, PNG ou WEBP. As fotos são reduzidas antes do envio e a localização gravada pelo celular é descartada.
        </p>
      </div>

      {message && (
        <p
          className={`media-manager__message media-manager__message--${message.type}`}
          role={message.type === 'error' ? 'alert' : 'status'}
        >
          {message.text}
        </p>
      )}
    </div>
  );
}

export default MediaManager;

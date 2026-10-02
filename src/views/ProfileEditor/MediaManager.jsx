'use client';

import { useState } from 'react';
import { getBrowserSupabase } from '../../lib/supabaseBrowser.js';
import { addArtistPhoto, removeArtistPhoto, setArtistCover } from '../../lib/profileActions.js';
import {
  MAX_GALLERY_PHOTOS, MEDIA_BUCKET, MediaError, newObjectPath, prepareImage,
} from '../../lib/artistMedia.js';

const ACCEPT = 'image/jpeg,image/png,image/webp';

/*
 * Foto principal e galeria. Fica fora do formulario do perfil: cada envio ou
 * remocao vale na hora, sem depender de "Salvar perfil".
 *
 * O arquivo vai do navegador direto ao Storage, ja reduzido por prepareImage;
 * depois a Server Action registra o caminho. Se o registro falhar, o arquivo
 * enviado e apagado para nao ficar orfao no bucket.
 */
async function uploadImage(artistId, file) {
  const blob = await prepareImage(file);
  const path = newObjectPath(artistId);
  const { error } = await getBrowserSupabase().storage
    .from(MEDIA_BUCKET)
    .upload(path, blob, { contentType: 'image/jpeg', cacheControl: '31536000' });
  if (error) throw new MediaError('O envio da imagem falhou. Tente novamente.');
  return path;
}

async function register(path, action) {
  const result = await action(path);
  if (result?.error) {
    await getBrowserSupabase().storage.from(MEDIA_BUCKET).remove([path]).catch(() => {});
    throw new MediaError(result.error);
  }
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

function MediaManager({ artistId, initialCover, initialGallery }) {
  const [cover, setCover] = useState(initialCover || null);
  const [gallery, setGallery] = useState(initialGallery);
  const [busy, setBusy] = useState(null);
  const [message, setMessage] = useState(null);
  const slotsLeft = MAX_GALLERY_PHOTOS - gallery.length;

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
      const path = await uploadImage(artistId, file);
      const { url } = await register(path, setArtistCover);
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
        const path = await uploadImage(artistId, file);
        const { photo } = await register(path, addArtistPhoto);
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
    <section className="media-manager" aria-labelledby="media-manager-title" aria-busy={busy !== null}>
      <h2 id="media-manager-title">Fotos</h2>
      <p className="profile-editor__hint">
        JPG, PNG ou WEBP. As fotos são reduzidas antes do envio e a localização gravada pelo
        celular é descartada. Alterações nesta seção valem na hora.
      </p>

      <div className="media-manager__cover">
        <div className="media-manager__cover-preview">
          {cover ? <img src={cover} alt="Foto principal atual" /> : <span>Sem foto principal</span>}
        </div>
        <div className="media-manager__actions">
          <h3>Foto principal</h3>
          <p className="profile-editor__hint">Aparece no topo do perfil e no catálogo.</p>
          <FileButton
            label={busy === 'cover' ? 'Enviando…' : cover ? 'Trocar foto' : 'Enviar foto'}
            disabled={busy !== null}
            onFiles={changeCover}
          />
          {cover && (
            <button className="media-manager__remove" type="button" disabled={busy !== null} onClick={removeCover}>
              Remover foto principal
            </button>
          )}
        </div>
      </div>

      <div className="media-manager__gallery">
        <h3>Galeria ({gallery.length}/{MAX_GALLERY_PHOTOS})</h3>
        {gallery.length > 0 && (
          <ul>
            {gallery.map((photo, index) => (
              <li key={photo.id}>
                <img src={photo.url} alt={`Foto ${index + 1} da galeria`} loading="lazy" />
                <button
                  className="media-manager__remove"
                  type="button"
                  disabled={busy !== null}
                  onClick={() => removePhoto(photo.id)}
                  aria-label={`Remover foto ${index + 1} da galeria`}
                >
                  {busy === photo.id ? 'Removendo…' : 'Remover'}
                </button>
              </li>
            ))}
          </ul>
        )}
        {slotsLeft > 0 && (
          <FileButton
            label={busy === 'gallery' ? 'Enviando…' : '+ Adicionar fotos'}
            multiple
            disabled={busy !== null}
            onFiles={addPhotos}
          />
        )}
      </div>

      {message && (
        <p
          className={`media-manager__message media-manager__message--${message.type}`}
          role={message.type === 'error' ? 'alert' : 'status'}
        >
          {message.text}
        </p>
      )}
    </section>
  );
}

export default MediaManager;

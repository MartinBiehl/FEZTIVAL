'use client';

import { useActionState, useState } from 'react';
import useActionSubmit from '../../hooks/useActionSubmit.js';
import Link from 'next/link';
import BrandLogo from '../../components/BrandLogo/BrandLogo.jsx';
import { saveArtistProfile } from '../../lib/profileActions.js';
import { INFRASTRUCTURE_STATUSES, SERVICE_DURATIONS } from '../../lib/profileEditor.js';
import './ProfileEditor.css';

const WEEKDAY_LABEL = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];

const CATEGORY_OPTIONS = [
  { value: 'dj', label: 'DJ' },
  { value: 'band', label: 'Banda' },
  { value: 'solo', label: 'Músico solo' },
];

/* Chave local para linhas novas, que ainda nao tem id do banco. */
let draftKey = 0;
const withKey = (row) => ({ ...row, key: row.id ?? `novo-${(draftKey += 1)}` });

function CheckboxGroup({ legend, name, options, selected }) {
  return (
    <fieldset className="profile-editor__choices">
      <legend>{legend}</legend>
      {options.map((option) => (
        <label key={option.id}>
          <input type="checkbox" name={name} value={option.id} defaultChecked={selected.includes(option.id)} />
          <span>{option.name}</span>
        </label>
      ))}
    </fieldset>
  );
}

/* Lista editavel: cada linha vira campos com o mesmo name, lidos com getAll. */
function RepeatableRows({ legend, rows, setRows, emptyRow, addLabel, renderRow }) {
  return (
    <fieldset className="profile-editor__rows">
      <legend>{legend}</legend>
      {rows.length === 0 && <p className="profile-editor__hint">Nenhum item ainda.</p>}
      {rows.map((row, index) => (
        <div className="profile-editor__row" key={row.key}>
          {renderRow(row, index)}
          <button
            className="profile-editor__remove"
            type="button"
            onClick={() => setRows((current) => current.filter((item) => item.key !== row.key))}
            aria-label={`Remover item ${index + 1} de ${legend}`}
          >
            Remover
          </button>
        </div>
      ))}
      <button className="profile-editor__add" type="button" onClick={() => setRows((current) => [...current, withKey(emptyRow)])}>
        + {addLabel}
      </button>
    </fieldset>
  );
}

function ProfileEditor({ profile, catalogs }) {
  const [state, formAction, isPending] = useActionState(saveArtistProfile, null);
  const submit = useActionSubmit(formAction);
  const [services, setServices] = useState(() => profile.services.map(withKey));
  const [infrastructure, setInfrastructure] = useState(() => profile.infrastructure.map(withKey));

  return (
    <div className="profile-editor">
      <header className="profile-editor__header page-container">
        <BrandLogo />
        <Link href="/painel">← Voltar ao painel</Link>
      </header>

      <main className="page-container">
        <div className="profile-editor__heading">
          <p className="eyebrow">Meu perfil</p>
          <h1>Editar perfil</h1>
          <p>
            Endereço público: <code>/artista/{profile.slug}</code>. O endereço não muda depois de criado,
            para não quebrar links já compartilhados.
          </p>
        </div>

        <form className="profile-editor__form" onSubmit={submit}>
          <fieldset>
            <legend>Apresentação</legend>
            <div className="profile-editor__grid">
              <label>
                Nome artístico
                <input name="stageName" required minLength={2} maxLength={80} defaultValue={profile.stageName} />
              </label>
              <label>
                Categoria
                <select name="category" required defaultValue={profile.category}>
                  {CATEGORY_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                </select>
              </label>
              <label>
                Cidade
                <input name="city" maxLength={80} placeholder="Ex.: Ivoti" defaultValue={profile.city} />
              </label>
              <label>
                Cor do perfil
                <input name="color" type="color" defaultValue={profile.color || '#ffd600'} />
              </label>
              <label className="profile-editor__full">
                Resumo (aparece no catálogo e no Google)
                <input name="bioShort" maxLength={200} defaultValue={profile.bioShort} placeholder="Uma frase sobre o seu som" />
              </label>
              <label className="profile-editor__full">
                Sobre
                <textarea name="bioLong" rows="6" maxLength={3000} defaultValue={profile.bioLong} />
              </label>
              <label className="profile-editor__full">
                Foto principal (endereço https da imagem)
                <input name="coverUrl" type="url" pattern="https://.*" maxLength={500} defaultValue={profile.coverUrl} placeholder="https://..." />
              </label>
            </div>
          </fieldset>

          <fieldset>
            <legend>Preço</legend>
            <div className="profile-editor__grid">
              <label>
                Preço inicial (R$)
                <input name="basePrice" type="number" min="0" step="0.01" inputMode="decimal" defaultValue={profile.basePrice} />
              </label>
              <label className="profile-editor__inline">
                <input name="priceOnRequest" type="checkbox" defaultChecked={profile.priceOnRequest} />
                <span>Exibir “Sob consulta” em vez do preço</span>
              </label>
            </div>
          </fieldset>

          <CheckboxGroup legend="Gêneros musicais" name="genres" options={catalogs.genres} selected={profile.genreIds} />

          <RepeatableRows
            legend="Serviços"
            addLabel="Adicionar serviço"
            rows={services}
            setRows={setServices}
            emptyRow={{ title: '', description: '', price: '', durationMinutes: '' }}
            renderRow={(row) => (
              <>
                <input type="hidden" name="serviceId" value={row.id ?? ''} />
                <label>
                  Título
                  <input name="serviceTitle" required maxLength={80} defaultValue={row.title} placeholder="Ex.: Set de 2 horas" />
                </label>
                <label>
                  Duração
                  <select name="serviceDuration" defaultValue={row.durationMinutes}>
                    <option value="">A combinar</option>
                    {SERVICE_DURATIONS.map((minutes) => (
                      <option key={minutes} value={minutes}>{minutes < 60 ? `${minutes} min` : `${minutes / 60}h`}</option>
                    ))}
                  </select>
                </label>
                <label>
                  Preço (R$)
                  <input name="servicePrice" type="number" min="0" step="0.01" inputMode="decimal" defaultValue={row.price} />
                </label>
                <label className="profile-editor__full">
                  Descrição
                  <input name="serviceDescription" maxLength={500} defaultValue={row.description} />
                </label>
              </>
            )}
          />

          <CheckboxGroup legend="Formas de pagamento aceitas" name="paymentMethods" options={catalogs.paymentMethods} selected={profile.paymentMethodIds} />
          <CheckboxGroup legend="Tipos de evento que atende" name="venueTypes" options={catalogs.venueTypes} selected={profile.venueTypeIds} />

          <fieldset>
            <legend>Área de atendimento</legend>
            <div className="profile-editor__grid">
              <label className="profile-editor__full">
                Resumo
                <input name="serviceAreaSummary" maxLength={300} defaultValue={profile.serviceAreaSummary} placeholder="Ex.: Ivoti e região, até 50 km" />
              </label>
              <label className="profile-editor__full">
                Cidades atendidas (uma por linha)
                <textarea name="serviceAreas" rows="4" defaultValue={profile.serviceAreas.join('\n')} />
              </label>
            </div>
          </fieldset>

          <RepeatableRows
            legend="Estrutura"
            addLabel="Adicionar item"
            rows={infrastructure}
            setRows={setInfrastructure}
            emptyRow={{ status: 'included', title: '', detail: '' }}
            renderRow={(row) => (
              <>
                <input type="hidden" name="infraId" value={row.id ?? ''} />
                <label>
                  Item
                  <input name="infraTitle" required maxLength={80} defaultValue={row.title} placeholder="Ex.: Caixas de som" />
                </label>
                <label>
                  Quem fornece
                  <select name="infraStatus" defaultValue={row.status}>
                    {INFRASTRUCTURE_STATUSES.map((status) => <option key={status.value} value={status.value}>{status.label}</option>)}
                  </select>
                </label>
                <label className="profile-editor__full">
                  Detalhe
                  <input name="infraDetail" maxLength={300} defaultValue={row.detail} />
                </label>
              </>
            )}
          />

          <fieldset className="profile-editor__hours">
            <legend>Horário de atendimento</legend>
            <p className="profile-editor__hint">Deixe todos desmarcados para não exibir horário no perfil.</p>
            {profile.weeklyHours.map((day) => (
              <div key={day.weekday}>
                <label className="profile-editor__inline">
                  <input type="checkbox" name={`day_${day.weekday}`} defaultChecked={day.isAvailable} />
                  <span>{WEEKDAY_LABEL[day.weekday]}</span>
                </label>
                <input type="time" name={`opens_${day.weekday}`} defaultValue={day.opensAt} aria-label={`Início de ${WEEKDAY_LABEL[day.weekday]}`} />
                <span aria-hidden="true">às</span>
                <input type="time" name={`closes_${day.weekday}`} defaultValue={day.closesAt} aria-label={`Fim de ${WEEKDAY_LABEL[day.weekday]}`} />
              </div>
            ))}
          </fieldset>

          <fieldset>
            <legend>Publicação</legend>
            <label className="profile-editor__inline">
              <input name="isPublished" type="checkbox" defaultChecked={profile.isPublished} />
              <span>Perfil publicado (aparece no catálogo e recebe propostas)</span>
            </label>
            <p className="profile-editor__hint">Para publicar: cidade, ao menos um gênero e preço (ou “sob consulta”).</p>
          </fieldset>

          <div className="profile-editor__footer">
            {state?.error && <p className="profile-editor__error" role="alert">{state.error}</p>}
            {state?.ok && (
              <p className="profile-editor__success" role="status">
                Perfil salvo.{' '}
                {state.isPublished && <Link href={`/artista/${state.slug}`}>Ver perfil público ↗</Link>}
              </p>
            )}
            <button type="submit" disabled={isPending} aria-busy={isPending}>
              {isPending ? 'Salvando…' : 'Salvar perfil'}
            </button>
          </div>
        </form>
      </main>
    </div>
  );
}

export default ProfileEditor;

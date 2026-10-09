'use client';

import { useActionState, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, ArrowUpRight, Check, Plus, Trash2 } from 'lucide-react';
import useActionSubmit from '../../hooks/useActionSubmit.js';
import BrandLogo from '../../components/BrandLogo/BrandLogo.jsx';
import { saveArtistProfile } from '../../lib/profileActions.js';
import { INFRASTRUCTURE_STATUSES, SERVICE_DURATIONS } from '../../lib/profileOptions.js';
import MediaManager from './MediaManager.jsx';
import './ProfileEditor.css';

const WEEKDAY_LABEL = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];

const CATEGORY_OPTIONS = [
  { value: 'dj', label: 'DJ' },
  { value: 'band', label: 'Banda' },
  { value: 'solo', label: 'Músico solo' },
];

const SECTIONS = [
  { id: 'fotos', label: 'Fotos' },
  { id: 'apresentacao', label: 'Apresentação' },
  { id: 'preco', label: 'Preço e serviços' },
  { id: 'estilo', label: 'Estilo e eventos' },
  { id: 'atendimento', label: 'Onde e quando' },
  { id: 'estrutura', label: 'Estrutura' },
  { id: 'publicacao', label: 'Publicação' },
];

/* Chave local para linhas novas, que ainda nao tem id do banco. */
let draftKey = 0;
const withKey = (row) => ({ ...row, key: row.id ?? `novo-${(draftKey += 1)}` });

/*
 * O que a previa e a lista de publicacao precisam, lido do proprio formulario.
 * Os campos continuam nao controlados; isto so acompanha o que foi digitado.
 */
function readSnapshot(form) {
  const data = new FormData(form);
  return {
    stageName: String(data.get('stageName') ?? '').trim(),
    category: String(data.get('category') ?? ''),
    city: String(data.get('city') ?? '').trim(),
    color: String(data.get('color') ?? ''),
    hasGenre: data.getAll('genres').length > 0,
    hasPrice: data.get('priceOnRequest') === 'on' || String(data.get('basePrice') ?? '') !== '',
  };
}

function initialSnapshot(profile) {
  return {
    stageName: profile.stageName,
    category: profile.category,
    city: profile.city,
    color: profile.color || '#ffd600',
    hasGenre: profile.genreIds.length > 0,
    hasPrice: profile.priceOnRequest || profile.basePrice !== '',
  };
}

function Section({ id, title, description, children }) {
  return (
    <section className="editor-section" id={id} aria-labelledby={`${id}-title`}>
      <header>
        <h2 id={`${id}-title`}>{title}</h2>
        {description && <p>{description}</p>}
      </header>
      <div className="editor-section__body">{children}</div>
    </section>
  );
}

function Switch({ name, defaultChecked, children, hint }) {
  return (
    <label className="editor-switch">
      <input type="checkbox" role="switch" name={name} defaultChecked={defaultChecked} />
      <span className="editor-switch__track" aria-hidden="true" />
      <span className="editor-switch__text">
        {children}
        {hint && <small>{hint}</small>}
      </span>
    </label>
  );
}

function ChoiceGroup({ legend, hint, name, options, selected }) {
  return (
    <fieldset className="editor-field">
      <legend>{legend}</legend>
      {hint && <p className="editor-hint">{hint}</p>}
      <div className="editor-chips">
        {options.map((option) => (
          <label key={option.id}>
            <input type="checkbox" name={name} value={option.id} defaultChecked={selected.includes(option.id)} />
            <span><Check size={14} strokeWidth={3} aria-hidden="true" />{option.name}</span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}

/* Lista editavel: cada linha vira campos com o mesmo name, lidos com getAll. */
function RepeatableRows({ itemLabel, emptyText, rows, setRows, emptyRow, addLabel, renderRow }) {
  return (
    <div className="editor-rows">
      {rows.length === 0 && <p className="editor-empty">{emptyText}</p>}
      {rows.map((row, index) => (
        <div className="editor-row" key={row.key}>
          <div className="editor-row__head">
            <strong>{itemLabel} {index + 1}</strong>
            <button
              type="button"
              onClick={() => setRows((current) => current.filter((item) => item.key !== row.key))}
              aria-label={`Remover ${itemLabel.toLowerCase()} ${index + 1}`}
            >
              <Trash2 size={16} aria-hidden="true" />
              Remover
            </button>
          </div>
          <div className="editor-grid">{renderRow(row, index)}</div>
        </div>
      ))}
      <button className="editor-add" type="button" onClick={() => setRows((current) => [...current, withKey(emptyRow)])}>
        <Plus size={18} aria-hidden="true" />
        {addLabel}
      </button>
    </div>
  );
}

function ProfilePreview({ snapshot, cover, isPublished }) {
  const category = CATEGORY_OPTIONS.find((option) => option.value === snapshot.category)?.label;
  return (
    <div className="editor-preview" style={{ '--artist-color': snapshot.color }}>
      <div className="editor-preview__media">
        {cover ? <img src={cover} alt="" /> : <span aria-hidden="true">{(snapshot.stageName || '?').slice(0, 1)}</span>}
      </div>
      <div className="editor-preview__body">
        <strong>{snapshot.stageName || 'Seu nome artístico'}</strong>
        <span>{[category, snapshot.city].filter(Boolean).join(' em ') || 'Categoria e cidade'}</span>
      </div>
      <p className={`editor-status${isPublished ? ' is-live' : ''}`}>
        {isPublished ? 'Publicado no catálogo' : 'Rascunho, só você vê'}
      </p>
    </div>
  );
}

function ProfileEditor({ profile, catalogs }) {
  const [state, formAction, isPending] = useActionState(saveArtistProfile, null);
  const submit = useActionSubmit(formAction);
  const formRef = useRef(null);
  const [services, setServices] = useState(() => profile.services.map(withKey));
  const [infrastructure, setInfrastructure] = useState(() => profile.infrastructure.map(withKey));
  const [snapshot, setSnapshot] = useState(() => initialSnapshot(profile));
  const [cover, setCover] = useState(profile.coverUrl || null);
  const [isDirty, setIsDirty] = useState(false);
  const isPublished = state?.ok ? state.isPublished : profile.isPublished;

  useEffect(() => {
    if (state?.ok) setIsDirty(false);
  }, [state]);

  function trackChanges() {
    setIsDirty(true);
    setSnapshot(readSnapshot(formRef.current));
  }

  /* Linhas de servico e estrutura nao disparam change ao serem removidas. */
  function editRows(setRows) {
    return (update) => {
      setRows(update);
      setIsDirty(true);
    };
  }

  const checklist = [
    { label: 'Cidade', done: snapshot.city !== '' },
    { label: 'Ao menos um gênero', done: snapshot.hasGenre },
    { label: 'Preço ou “sob consulta”', done: snapshot.hasPrice },
  ];
  const canPublish = checklist.every((item) => item.done);

  let status = null;
  if (isPending) status = { tone: 'muted', text: 'Salvando…' };
  else if (state?.error) status = { tone: 'error', text: state.error };
  else if (isDirty) status = { tone: 'muted', text: 'Alterações não salvas' };
  else if (state?.ok) status = { tone: 'ok', text: 'Perfil salvo' };
  else status = { tone: 'muted', text: 'Nenhuma alteração pendente' };

  return (
    <div className="profile-editor">
      <header className="editor-topbar">
        <div className="page-container">
          <BrandLogo />
          <nav aria-label="Atalhos do painel">
            <Link href="/painel"><ArrowLeft size={16} aria-hidden="true" />Painel</Link>
            {isPublished && (
              <Link href={`/artista/${profile.slug}`} target="_blank">
                Ver perfil público<ArrowUpRight size={16} aria-hidden="true" />
              </Link>
            )}
          </nav>
        </div>
      </header>

      <div className="editor-layout page-container">
        <aside className="editor-aside">
          <ProfilePreview snapshot={snapshot} cover={cover} isPublished={isPublished} />
          <nav className="editor-nav" aria-label="Seções do perfil">
            {SECTIONS.map((section) => <a key={section.id} href={`#${section.id}`}>{section.label}</a>)}
          </nav>
        </aside>

        <main className="editor-main">
          <div className="editor-heading">
            <h1>Seu perfil de artista</h1>
            <p>
              É o que contratantes veem antes de pedir uma proposta. Seu endereço é{' '}
              <code>feztival/artista/{profile.slug}</code> e não muda, para não quebrar links já compartilhados.
            </p>
          </div>

          <Section id="fotos" title="Fotos" description="Enviar ou remover uma foto vale na hora, sem precisar salvar.">
            <MediaManager
              initialCover={profile.coverUrl}
              initialGallery={profile.gallery}
              onCoverChange={setCover}
            />
          </Section>

          <form ref={formRef} className="editor-form" onSubmit={submit} onChange={trackChanges}>
            <Section id="apresentacao" title="Apresentação" description="Nome, categoria e um texto curto sobre o seu som.">
              <div className="editor-grid">
                <label className="editor-field">
                  <span>Nome artístico</span>
                  <input name="stageName" required minLength={2} maxLength={80} defaultValue={profile.stageName} />
                </label>
                <label className="editor-field">
                  <span>Categoria</span>
                  <select name="category" required defaultValue={profile.category}>
                    {CATEGORY_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                  </select>
                </label>
                <label className="editor-field">
                  <span>Cidade</span>
                  <input name="city" maxLength={80} placeholder="Ex.: Ivoti" defaultValue={profile.city} autoComplete="address-level2" />
                </label>
                <label className="editor-field editor-field--color">
                  <span>Cor do perfil</span>
                  <span className="editor-color">
                    <input name="color" type="color" defaultValue={profile.color || '#ffd600'} />
                    <small>Usada no seu cartão e no topo do perfil.</small>
                  </span>
                </label>
                <label className="editor-field editor-grid__full">
                  <span>Resumo</span>
                  <input name="bioShort" maxLength={200} defaultValue={profile.bioShort} placeholder="Uma frase sobre o seu som" />
                  <small className="editor-hint">Aparece no catálogo e nos resultados do Google. Até 200 caracteres.</small>
                </label>
                <label className="editor-field editor-grid__full">
                  <span>Sobre</span>
                  <textarea name="bioLong" rows="6" maxLength={3000} defaultValue={profile.bioLong} placeholder="Sua história, formação, repertório, onde já tocou…" />
                </label>
              </div>
            </Section>

            <Section id="preco" title="Preço e serviços" description="O preço inicial aparece no catálogo. Cada serviço vira uma opção de duração na proposta.">
              <div className="editor-grid">
                <label className="editor-field">
                  <span>Preço inicial</span>
                  <span className="editor-money">
                    <span aria-hidden="true">R$</span>
                    <input name="basePrice" type="number" min="0" step="0.01" inputMode="decimal" defaultValue={profile.basePrice} placeholder="0,00" />
                  </span>
                </label>
                <div className="editor-field editor-field--switch">
                  <Switch name="priceOnRequest" defaultChecked={profile.priceOnRequest} hint="Esconde o valor no catálogo e no perfil.">
                    Mostrar “Sob consulta”
                  </Switch>
                </div>
              </div>

              <div className="editor-subsection">
                <h3>Serviços</h3>
                <RepeatableRows
                  itemLabel="Serviço"
                  emptyText="Sem serviços, a proposta não oferece escolha de duração."
                  addLabel="Adicionar serviço"
                  rows={services}
                  setRows={editRows(setServices)}
                  emptyRow={{ title: '', description: '', price: '', durationMinutes: '' }}
                  renderRow={(row) => (
                    <>
                      <input type="hidden" name="serviceId" value={row.id ?? ''} />
                      <label className="editor-field editor-grid__full">
                        <span>Título</span>
                        <input name="serviceTitle" required maxLength={80} defaultValue={row.title} placeholder="Ex.: Set de 2 horas" />
                      </label>
                      <label className="editor-field">
                        <span>Duração</span>
                        <select name="serviceDuration" defaultValue={row.durationMinutes}>
                          <option value="">A combinar</option>
                          {SERVICE_DURATIONS.map((minutes) => (
                            <option key={minutes} value={minutes}>{minutes < 60 ? `${minutes} min` : `${minutes / 60}h`}</option>
                          ))}
                        </select>
                      </label>
                      <label className="editor-field">
                        <span>Preço</span>
                        <span className="editor-money">
                          <span aria-hidden="true">R$</span>
                          <input name="servicePrice" type="number" min="0" step="0.01" inputMode="decimal" defaultValue={row.price} placeholder="0,00" />
                        </span>
                      </label>
                      <label className="editor-field editor-grid__full">
                        <span>Descrição</span>
                        <input name="serviceDescription" maxLength={500} defaultValue={row.description} placeholder="O que está incluso" />
                      </label>
                    </>
                  )}
                />
              </div>
            </Section>

            <Section id="estilo" title="Estilo e eventos" description="Usados nos filtros de busca. Marque tudo que se aplica.">
              <ChoiceGroup legend="Gêneros musicais" name="genres" options={catalogs.genres} selected={profile.genreIds} />
              <ChoiceGroup legend="Tipos de evento que atende" name="venueTypes" options={catalogs.venueTypes} selected={profile.venueTypeIds} />
              <ChoiceGroup legend="Formas de pagamento aceitas" name="paymentMethods" options={catalogs.paymentMethods} selected={profile.paymentMethodIds} />
            </Section>

            <Section id="atendimento" title="Onde e quando" description="Região que você atende e os dias em que costuma tocar.">
              <div className="editor-grid">
                <label className="editor-field editor-grid__full">
                  <span>Resumo da região</span>
                  <input name="serviceAreaSummary" maxLength={300} defaultValue={profile.serviceAreaSummary} placeholder="Ex.: Ivoti e região, até 50 km" />
                </label>
                <label className="editor-field editor-grid__full">
                  <span>Cidades atendidas</span>
                  <textarea name="serviceAreas" rows="4" defaultValue={profile.serviceAreas.join('\n')} placeholder={'Ivoti\nNovo Hamburgo\nDois Irmãos'} />
                  <small className="editor-hint">Uma cidade por linha.</small>
                </label>
              </div>

              <fieldset className="editor-field editor-hours">
                <legend>Horário de atendimento</legend>
                <p className="editor-hint">Sem nenhum dia ativo, o perfil não mostra horário.</p>
                <div className="editor-hours__list">
                  {profile.weeklyHours.map((day) => (
                    <div className="editor-hours__day" key={day.weekday}>
                      <Switch name={`day_${day.weekday}`} defaultChecked={day.isAvailable}>
                        {WEEKDAY_LABEL[day.weekday]}
                      </Switch>
                      <div className="editor-hours__times">
                        <input type="time" name={`opens_${day.weekday}`} defaultValue={day.opensAt} aria-label={`Início de ${WEEKDAY_LABEL[day.weekday]}`} />
                        <span aria-hidden="true">até</span>
                        <input type="time" name={`closes_${day.weekday}`} defaultValue={day.closesAt} aria-label={`Fim de ${WEEKDAY_LABEL[day.weekday]}`} />
                      </div>
                    </div>
                  ))}
                </div>
              </fieldset>
            </Section>

            <Section id="estrutura" title="Estrutura" description="Equipamento que você leva e o que o local precisa ter.">
              <RepeatableRows
                itemLabel="Item"
                emptyText="Nenhum item. Liste som, luz ou palco para evitar surpresas no dia."
                addLabel="Adicionar item"
                rows={infrastructure}
                setRows={editRows(setInfrastructure)}
                emptyRow={{ status: 'included', title: '', detail: '' }}
                renderRow={(row) => (
                  <>
                    <input type="hidden" name="infraId" value={row.id ?? ''} />
                    <label className="editor-field">
                      <span>Item</span>
                      <input name="infraTitle" required maxLength={80} defaultValue={row.title} placeholder="Ex.: Caixas de som" />
                    </label>
                    <label className="editor-field">
                      <span>Quem fornece</span>
                      <select name="infraStatus" defaultValue={row.status}>
                        {INFRASTRUCTURE_STATUSES.map((status) => <option key={status.value} value={status.value}>{status.label}</option>)}
                      </select>
                    </label>
                    <label className="editor-field editor-grid__full">
                      <span>Detalhe</span>
                      <input name="infraDetail" maxLength={300} defaultValue={row.detail} placeholder="Ex.: 2 caixas de 500 W" />
                    </label>
                  </>
                )}
              />
            </Section>

            <Section id="publicacao" title="Publicação" description="Publicado, o perfil aparece no catálogo e pode receber propostas.">
              <ul className="editor-checklist" aria-label="Requisitos para publicar">
                {checklist.map((item) => (
                  <li key={item.label} className={item.done ? 'is-done' : undefined}>
                    <span aria-hidden="true">{item.done && <Check size={14} strokeWidth={3} />}</span>
                    {item.label}
                    <span className="sr-only">{item.done ? ', preenchido' : ', pendente'}</span>
                  </li>
                ))}
              </ul>
              <Switch
                name="isPublished"
                defaultChecked={profile.isPublished}
                hint={canPublish ? 'Você pode desligar quando quiser.' : 'Complete os itens acima para publicar.'}
              >
                Perfil publicado
              </Switch>
            </Section>

            <div className="editor-savebar">
              <p className={`editor-savebar__status${status ? ` is-${status.tone}` : ''}`} role={state?.error ? 'alert' : 'status'}>
                {status?.tone === 'ok' && <Check size={16} strokeWidth={3} aria-hidden="true" />}
                {status?.text}
              </p>
              <button type="submit" disabled={isPending} aria-busy={isPending}>
                {isPending ? 'Salvando…' : 'Salvar perfil'}
              </button>
            </div>
          </form>
        </main>
      </div>
    </div>
  );
}

export default ProfileEditor;

import { useState } from 'react'
import type { SavedPlan } from '../types/plano'
import { IconBox } from '../../../components/ui/IconBox'
import { TrashIcon } from '../../telemetria/components/sensorGroupModal/icons'

type SavedPlansPanelProps = {
  savedPlans: SavedPlan[]
  onDeletePlan: (planId: string) => void
  onReplicatePlan: (plan: SavedPlan) => void
}

export function SavedPlansPanel({ savedPlans, onDeletePlan, onReplicatePlan }: SavedPlansPanelProps) {
  const [planToDelete, setPlanToDelete] = useState<SavedPlan | null>(null)

  function confirmDeletePlan() {
    if (!planToDelete) return
    onDeletePlan(planToDelete.id)
    setPlanToDelete(null)
  }

  return (
    <div className="relative overflow-hidden rounded-2xl bg-white shadow-2xl shadow-zinc-950/20 ring-1 ring-zinc-200/80">
      <div className="border-b border-zinc-200 bg-zinc-50 px-5 py-4">
        <div className="flex items-start gap-3 pr-8">
          <IconBox variant="task" size="md">
            <svg aria-hidden="true" className="h-5 w-5" viewBox="0 0 24 24">
              <path
                d="M5 5.5A2.5 2.5 0 0 1 7.5 3h9A2.5 2.5 0 0 1 19 5.5v15l-7-3.8-7 3.8z"
                fill="none"
                stroke="currentColor"
                strokeLinejoin="round"
                strokeWidth="1.8"
              />
            </svg>
          </IconBox>

          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-lg font-bold tracking-tight text-zinc-950">Planos guardados</h2>
              <span className="rounded-full bg-white px-2 py-0.5 text-xs font-semibold text-zinc-600 ring-1 ring-zinc-200">
                {savedPlans.length}
              </span>
            </div>
            <p className="mt-1 text-sm leading-5 text-zinc-600">
              Selecciona un plano para cargar de nuevo sus lineas y variables colocadas.
            </p>
          </div>
        </div>
      </div>

      <div className="max-h-[min(520px,70vh)] space-y-3 overflow-y-auto p-5">
        {savedPlans.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-zinc-300 bg-zinc-50 px-5 py-8 text-center">
            <IconBox variant="data" size="lg">
              <svg aria-hidden="true" className="h-6 w-6" viewBox="0 0 24 24">
                <path
                  d="M4 19V5a2 2 0 0 1 2-2h10l4 4v12a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2Z"
                  fill="none"
                  stroke="currentColor"
                  strokeLinejoin="round"
                  strokeWidth="1.8"
                />
                <path d="M14 3v5h5" fill="none" stroke="currentColor" strokeLinejoin="round" strokeWidth="1.8" />
              </svg>
            </IconBox>
            <p className="mt-3 text-sm font-semibold text-zinc-800">Aún no hay planos guardados.</p>
            <p className="mt-1 text-sm text-zinc-500">Cuando guardes un plano, aparecera aqui.</p>
          </div>
        ) : (
          savedPlans.map((plan) => (
            <article
              key={plan.id}
              className="group rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:border-zinc-300 hover:shadow-md"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex min-w-0 items-center gap-2">
                    <h3 className="truncate text-base font-bold text-zinc-950">{plan.name}</h3>
                    <button
                      aria-label={`Eliminar plano ${plan.name}`}
                      className="saved-plan-delete-button"
                      onClick={() => setPlanToDelete(plan)}
                      title="Eliminar plano"
                      type="button"
                    >
                      <TrashIcon />
                    </button>
                  </div>
                  <p className="mt-1 text-sm text-zinc-500">Guardado: {plan.createdAt}</p>

                  <div className="mt-3 flex flex-wrap gap-2">
                    <PlanMetric label="Variables" value={plan.variables.length} />
                    <PlanMetric label="Procesos" value={plan.processes?.length ?? 0} />
                  </div>
                </div>

                <button
                  onClick={() => onReplicatePlan(plan)}
                  title="Replicar diseño"
                  className="inline-flex min-h-10 shrink-0 items-center gap-2 rounded-xl bg-zinc-900 px-3 text-sm font-semibold text-white shadow-sm transition hover:bg-zinc-700"
                  type="button"
                >
                  <svg aria-hidden="true" className="h-4 w-4" viewBox="0 0 24 24">
                    <path
                      d="M8 8V5.5A1.5 1.5 0 0 1 9.5 4h9A1.5 1.5 0 0 1 20 5.5v9A1.5 1.5 0 0 1 18.5 16H16"
                      fill="none"
                      stroke="currentColor"
                      strokeLinejoin="round"
                      strokeWidth="1.8"
                    />
                    <rect
                      width="12"
                      height="12"
                      x="4"
                      y="8"
                      fill="none"
                      stroke="currentColor"
                      rx="1.8"
                      strokeLinejoin="round"
                      strokeWidth="1.8"
                    />
                  </svg>
                  Cargar
                </button>
              </div>
            </article>
          ))
        )}
      </div>

      {planToDelete && (
        <div className="delete-group-confirm-backdrop" role="presentation">
          <section
            className="delete-group-confirm"
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="delete-plan-confirm-title"
            aria-describedby="delete-plan-confirm-description"
          >
            <span className="delete-group-confirm-icon">
              <TrashIcon />
            </span>

            <div>
              <h3 id="delete-plan-confirm-title">Eliminar este plano?</h3>
              <p id="delete-plan-confirm-description">
                Esta accion eliminara "{planToDelete.name}" de la lista de planos guardados.
              </p>
            </div>

            <div className="delete-group-confirm-actions">
              <button className="delete-group-cancel" onClick={() => setPlanToDelete(null)} type="button">
                Cancelar
              </button>
              <button className="delete-group-confirm-button" onClick={confirmDeletePlan} type="button">
                Si, eliminar
              </button>
            </div>
          </section>
        </div>
      )}
    </div>
  )
}

function PlanMetric({ label, value }: { label: string; value: number }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-zinc-100 px-2.5 py-1 text-xs font-semibold text-zinc-600">
      <strong className="text-zinc-900">{value}</strong>
      {label}
    </span>
  )
}

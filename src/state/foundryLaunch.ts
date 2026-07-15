import type { SystemTemplateId } from '../data/systemTemplates'

export const OPEN_FOUNDRY_EVENT = 'recsys-open-foundry'

export interface FoundryLaunchDetail {
  templateId: SystemTemplateId
}

export function launchFoundry(templateId: SystemTemplateId = 'hybrid') {
  if (typeof window === 'undefined') return
  window.dispatchEvent(new CustomEvent<FoundryLaunchDetail>(OPEN_FOUNDRY_EVENT, {
    detail: { templateId },
  }))
}

export function isFoundryLaunchEvent(event: Event): event is CustomEvent<FoundryLaunchDetail> {
  return event instanceof CustomEvent
    && Boolean(event.detail?.templateId)
}

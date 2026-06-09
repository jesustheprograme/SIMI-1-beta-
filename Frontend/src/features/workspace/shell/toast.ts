import { sileo } from 'sileo'

export function showWorkspaceToast(title: string, description: string, duration = 4200) {
  sileo.success({
    title,
    description,
    duration,
    fill: '#171717',
    styles: {
      title: 'workspace-toast-title',
      description: 'workspace-toast-description',
    },
  })
}

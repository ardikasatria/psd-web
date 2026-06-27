'use client'

import { Description, Label } from '@/shared/fieldset'
import { Switch, SwitchField } from '@/shared/switch'

export function SettingsToggleRow({
  label,
  description,
  checked,
  onChange,
  disabled,
}: {
  label: string
  description: string
  checked: boolean
  onChange: (value: boolean) => void
  disabled?: boolean
}) {
  return (
    <SwitchField>
      <Label>{label}</Label>
      <Description>{description}</Description>
      <Switch color="primary" checked={checked} onChange={onChange} disabled={disabled} />
    </SwitchField>
  )
}

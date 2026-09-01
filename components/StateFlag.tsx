import { stateFlagUrl } from '@/lib/city-media'

type Props = {
  stateCode: string
  stateName?: string
  className?: string
  eager?: boolean
}

export function StateFlag({ stateCode, stateName, className, eager = false }: Props) {
  const label = stateName ? `${stateName} flag` : `${stateCode} flag`

  return (
    <img
      className={['state-flag', className].filter(Boolean).join(' ')}
      src={stateFlagUrl(stateCode)}
      alt={label}
      width={40}
      height={27}
      loading={eager ? 'eager' : 'lazy'}
      decoding="async"
    />
  )
}

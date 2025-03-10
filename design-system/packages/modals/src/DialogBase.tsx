/** @jsxRuntime classic */
/** @jsx jsx */

import { Fragment, type KeyboardEvent, type ReactNode } from 'react'
import FocusLock from 'react-focus-lock'
import { RemoveScroll } from 'react-remove-scroll'
import { jsx, keyframes, Portal, useTheme } from '@keystone-ui/core'
import { Blanket } from './Blanket'

type DialogBaseProps = {
  children: ReactNode
  isOpen: boolean
  onClose: () => void
  width: number
}

const slideInAnim = keyframes({
  from: {
    transform: 'translateY(20%)',
    opacity: 0,
  },
})
const easing = 'cubic-bezier(0.2, 0, 0, 1)'

export const DialogBase = ({ children, isOpen, onClose, width, ...props }: DialogBaseProps) => {
  const theme = useTheme()

  const onKeyDown = (event: KeyboardEvent) => {
    if (event.key === 'Escape' && !event.defaultPrevented) {
      event.preventDefault() // Avoid potential drawer close
      onClose()
    }
  }

  return isOpen ? (
    <Portal>
      <Fragment>
        <Blanket onClick={onClose} />
        <FocusLock autoFocus returnFocus>
          <RemoveScroll enabled>
            <div
              css={{
                position: 'fixed',
                top: 0,
                left: 0,
                width: '100%',
                height: '100%',
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
              }}
            >
              <div
                aria-modal="true"
                role="dialog"
                tabIndex={-1}
                onKeyDown={onKeyDown}
                css={{
                  animation: `${slideInAnim} 320ms ${easing}`,
                  backgroundColor: theme.colors.background,
                  borderRadius: theme.radii.large,
                  boxShadow: theme.shadow.s400,
                  transition: `transform 150ms ${easing}`,
                  width,
                  maxHeight: '90vh',
                  overflow: 'scroll',
                  zIndex: theme.elevation.e400,
                }}
                {...props}
              >
                {children}
              </div>
            </div>
          </RemoveScroll>
        </FocusLock>
      </Fragment>
    </Portal>
  ) : null
}

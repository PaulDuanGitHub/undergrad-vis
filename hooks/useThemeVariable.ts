import { useEffect, useState } from 'react';

function getCssVariableValue(variableName: string): string {
  if (typeof window === 'undefined' || !window.document) {
    return '';
  }

  const root = window.document.documentElement;
  const computedStyle = window.getComputedStyle(root);
  return computedStyle.getPropertyValue(variableName).trim();
}

export function useThemeVariable(variableName: string): string {
  const [value, setValue] = useState<string>('');

  useEffect(() => {
    // The variable is resolved from the computed style after mount; it is an
    // external-system read, not state that can be derived during render.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setValue(getCssVariableValue(variableName));
  }, [variableName]);

  return value;
}

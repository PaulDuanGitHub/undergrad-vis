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
    setValue(getCssVariableValue(variableName));
  }, [variableName]);

  return value;
}

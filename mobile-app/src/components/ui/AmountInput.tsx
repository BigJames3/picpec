import { TextInput } from 'react-native';
import { useState, useEffect } from 'react';

interface Props {
  value: number;
  onChange: (value: number) => void;
  label?: string;
}

export const AmountInput = ({
  value,
  onChange,
  label = 'Montant (XOF)',
}: Props) => {
  const [display, setDisplay] = useState(value > 0 ? value.toString() : '');

  useEffect(() => {
    if (value === 0 && display !== '') setDisplay('');
  }, [value]);

  return (
    <TextInput
      placeholder={label}
      value={display}
      onChangeText={(text: string) => {
        const clean = text.replace(/[^0-9]/g, '');
        setDisplay(clean);
        onChange(clean ? parseInt(clean, 10) : 0);
      }}
      keyboardType="numeric"
      style={{
        borderWidth: 1,
        borderColor: '#D1D5DB',
        borderRadius: 8,
        padding: 12,
        fontSize: 16,
        backgroundColor: '#fff',
        marginBottom: 8,
      }}
    />
  );
};

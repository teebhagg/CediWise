import React from 'react'
import { Text, Platform, View } from 'react-native'
import { FieldError, InputGroup, TextField } from 'heroui-native'

interface PhonenNumberInputProps {
  phoneNumber: string
  setPhoneNumber: (text: string) => void
  error?: string
}

const formatPhoneNumber = (text: string) => {
  // Strip all non-digits
  let cleaned = text.replace(/\D/g, '')

  // If pasted with country code (e.g. 233241234567), strip the country code
  if (cleaned.startsWith('233') && cleaned.length > 9) {
    cleaned = cleaned.substring(3)
  }

  // Strip leading 0 since the +233 prefix is already provided
  if (cleaned.startsWith('0')) {
    cleaned = cleaned.substring(1)
  }

  // Limit to 9 national digits
  cleaned = cleaned.slice(0, 9)

  // Format as XX XXX XXXX
  const match = cleaned.match(/^(\d{0,2})(\d{0,3})(\d{0,4})$/)
  if (match) {
    return [match[1], match[2], match[3]].filter(Boolean).join(' ')
  }
  return cleaned
}

function PhonenNumberInput({ phoneNumber, setPhoneNumber, error }: PhonenNumberInputProps) {
  const handlePhoneNumberChange = (text: string) => {
    const formatted = formatPhoneNumber(text)
    setPhoneNumber(formatted)
  }

  return (
    <TextField isInvalid={!!error}>
      <InputGroup className="bg-slate-900/40 border-slate-700 h-[56px] rounded-[18px]">
        <InputGroup.Prefix className="pl-4">
          <View className="h-full justify-center">
            <Text className="text-white font-medium text-base">+233</Text>
          </View>
        </InputGroup.Prefix>
        <InputGroup.Input
          value={phoneNumber}
          onChangeText={handlePhoneNumberChange}
          placeholder="24 000 0000"
          placeholderTextColor="rgba(148, 163, 184, 0.4)"
          keyboardType="phone-pad"
          autoComplete="tel"
          returnKeyType="done"
          textContentType="telephoneNumber"
          textAlignVertical='center'
          className="flex-1 text-white font-medium text-base"
          style={{ lineHeight: 20, fontSize: 16 }}
        />
      </InputGroup>
      <FieldError className="mt-1 ml-1">{error}</FieldError>
    </TextField>
  )
}

export default PhonenNumberInput
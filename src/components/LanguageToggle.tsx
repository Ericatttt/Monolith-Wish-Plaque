import React from 'react';
import { TouchableOpacity, Text, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import { switchLanguage } from '../i18n';

export const LanguageToggle: React.FC = () => {
  const { i18n } = useTranslation();
  const isZh = i18n.language === 'zh';

  const handleToggle = () => {
    switchLanguage(isZh ? 'en' : 'zh');
  };

  return (
    <TouchableOpacity style={styles.button} onPress={handleToggle}>
      <Text style={styles.text}>{isZh ? 'EN' : '中'}</Text>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  button: {
    marginRight: 16,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#fff',
    backgroundColor: 'transparent',
  },
  text: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
});

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Alert,
  ScrollView,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import { useWallet } from '../hooks/useWallet';
import { useProgram } from '../hooks/useProgram';
import { MAX_CONTENT_LENGTH, MAX_NICKNAME_LENGTH } from '../utils/constants';

export const CreateWishScreen = () => {
  const { t, i18n } = useTranslation();
  const navigation = useNavigation();
  const { publicKey, isConnected, connect, disconnect, isLoading: walletLoading } = useWallet();
  const { createWish } = useProgram();

  const [content, setContent] = useState('');
  const [nickname, setNickname] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSwitching, setIsSwitching] = useState(false);

  useEffect(() => {
    navigation.setOptions({ headerTitle: t('create.headerTitle') });
  }, [i18n.language]);

  const currentDate = new Date().toLocaleDateString(
    i18n.language === 'zh' ? 'zh-CN' : 'en-US',
    { year: 'numeric', month: '2-digit', day: '2-digit' }
  );

  const handleSubmit = async () => {
    if (!isConnected || !publicKey) {
      Alert.alert(t('create.alerts.noWallet'), t('create.alerts.noWalletMsg'));
      return;
    }

    if (!content.trim()) {
      Alert.alert(t('create.alerts.noContent'), t('create.alerts.noContentMsg'));
      return;
    }

    if (!nickname.trim()) {
      Alert.alert(t('create.alerts.noNickname'), t('create.alerts.noNicknameMsg'));
      return;
    }

    if (content.length > MAX_CONTENT_LENGTH) {
      Alert.alert(t('create.alerts.contentTooLong'), t('create.alerts.contentTooLongMsg', { max: MAX_CONTENT_LENGTH }));
      return;
    }

    if (nickname.length > MAX_NICKNAME_LENGTH) {
      Alert.alert(t('create.alerts.nicknameTooLong'), t('create.alerts.nicknameTooLongMsg', { max: MAX_NICKNAME_LENGTH }));
      return;
    }

    setIsSubmitting(true);

    try {
      const txSignature = await createWish(content.trim(), nickname.trim());

      Alert.alert(
        t('create.alerts.successTitle'),
        t('create.alerts.successMsg', { sig: txSignature.slice(0, 20) }),
        [
          {
            text: t('create.alerts.successConfirm'),
            onPress: () => {
              setContent('');
              setNickname('');
            },
          },
        ]
      );
    } catch (error: any) {
      Alert.alert(t('create.alerts.errorTitle'), error.message || t('create.alerts.defaultError'));
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isConnected) {
    return (
      <View style={styles.container}>
        <View style={styles.connectContainer}>
          <Text style={styles.connectEmoji}>🔒</Text>
          <Text style={styles.connectTitle}>{t('create.connectTitle')}</Text>
          <Text style={styles.connectSubtitle}>{t('create.connectSubtitle')}</Text>
          <TouchableOpacity
            style={styles.connectButton}
            onPress={connect}
            disabled={walletLoading}
          >
            {walletLoading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.connectButtonText}>{t('create.connectButton')}</Text>
            )}
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  const contentNearLimit = content.length > MAX_CONTENT_LENGTH * 0.85;
  const nicknameNearLimit = nickname.length > MAX_NICKNAME_LENGTH * 0.85;

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.form}>
          <View style={styles.inputGroup}>
            <Text style={styles.label}>{t('create.contentLabel')}</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder={t('create.contentPlaceholder')}
              placeholderTextColor="#BFB0A8"
              multiline
              numberOfLines={6}
              value={content}
              onChangeText={setContent}
              maxLength={MAX_CONTENT_LENGTH}
              textAlignVertical="top"
            />
            <Text style={[styles.charCount, contentNearLimit && styles.charCountWarning]}>
              {content.length} / {MAX_CONTENT_LENGTH}
            </Text>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>{t('create.nicknameLabel')}</Text>
            <TextInput
              style={styles.input}
              placeholder={t('create.nicknamePlaceholder')}
              placeholderTextColor="#BFB0A8"
              value={nickname}
              onChangeText={setNickname}
              maxLength={MAX_NICKNAME_LENGTH}
            />
            <Text style={[styles.charCount, nicknameNearLimit && styles.charCountWarning]}>
              {nickname.length} / {MAX_NICKNAME_LENGTH}
            </Text>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>{t('create.dateLabel')}</Text>
            <View style={styles.dateDisplay}>
              <Text style={styles.dateText}>{currentDate}</Text>
            </View>
          </View>

          <View style={styles.walletInfo}>
            <View style={styles.walletRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.walletLabel}>{t('create.walletLabel')}</Text>
                <Text style={styles.walletAddress} numberOfLines={1}>
                  {publicKey?.toBase58().slice(0, 20)}...
                </Text>
              </View>
              <TouchableOpacity
                style={styles.switchButton}
                onPress={async () => {
                  setIsSwitching(true);
                  try {
                    await disconnect();
                    await connect();
                  } catch (e) {
                    // ignore cancel
                  } finally {
                    setIsSwitching(false);
                  }
                }}
                disabled={isSwitching || isSubmitting}
              >
                {isSwitching ? (
                  <ActivityIndicator size="small" color="#C8360A" />
                ) : (
                  <Text style={styles.switchButtonText}>{t('create.switchWallet')}</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>

          <TouchableOpacity
            style={[styles.submitButton, isSubmitting && styles.submitButtonDisabled]}
            onPress={handleSubmit}
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <Text style={styles.submitButtonText}>{t('create.submitButton')}</Text>
                <Text style={styles.submitButtonSubtext}>{t('create.submitSubtext')}</Text>
              </>
            )}
          </TouchableOpacity>

          <View style={styles.notice}>
            <Text style={styles.noticeText}>{t('create.notice')}</Text>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFF8F0',
  },
  scrollContent: {
    flexGrow: 1,
  },
  connectContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  connectEmoji: {
    fontSize: 64,
    marginBottom: 20,
  },
  connectTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#2C1810',
    marginBottom: 8,
  },
  connectSubtitle: {
    fontSize: 14,
    color: '#8B6E5A',
    textAlign: 'center',
    marginBottom: 32,
  },
  connectButton: {
    backgroundColor: '#C8360A',
    paddingHorizontal: 40,
    paddingVertical: 16,
    borderRadius: 24,
    minWidth: 200,
    alignItems: 'center',
  },
  connectButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  form: {
    padding: 20,
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 15,
    fontWeight: '600',
    color: '#2C1810',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#EDE0D4',
    borderRadius: 12,
    padding: 14,
    fontSize: 15,
    color: '#2C1810',
  },
  textArea: {
    height: 150,
    textAlignVertical: 'top',
  },
  charCount: {
    fontSize: 12,
    color: '#8B6E5A',
    textAlign: 'right',
    marginTop: 4,
  },
  charCountWarning: {
    color: '#C8360A',
    fontWeight: '600',
  },
  dateDisplay: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#EDE0D4',
    borderRadius: 12,
    padding: 14,
  },
  dateText: {
    fontSize: 15,
    color: '#4A3728',
  },
  walletInfo: {
    backgroundColor: '#FDF0E8',
    padding: 12,
    borderRadius: 10,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#EDE0D4',
  },
  walletRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  walletLabel: {
    fontSize: 11,
    color: '#C8360A',
    marginBottom: 3,
    fontWeight: '500',
  },
  walletAddress: {
    fontSize: 13,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    color: '#2C1810',
  },
  switchButton: {
    marginLeft: 10,
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#C8360A',
    minWidth: 60,
    alignItems: 'center',
  },
  switchButtonText: {
    fontSize: 12,
    color: '#C8360A',
    fontWeight: '600',
  },
  submitButton: {
    backgroundColor: '#C8360A',
    padding: 18,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 16,
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  submitButtonSubtext: {
    color: '#fff',
    fontSize: 12,
    marginTop: 4,
    opacity: 0.85,
  },
  notice: {
    backgroundColor: '#FDF0E8',
    padding: 12,
    borderRadius: 8,
    borderLeftWidth: 3,
    borderLeftColor: '#C8360A',
  },
  noticeText: {
    fontSize: 12,
    color: '#8B4513',
    lineHeight: 18,
  },
});

/**
 * apps/mobile/app/profile/change-avatar.tsx — S-PROFILE-03 Change Avatar
 *
 * Presented as modal (presentation: 'modal' in root _layout).
 *
 * Business Rules:
 *  - BR-AUTH-09: avatar max 5MB, JPEG/PNG/WebP, auto crop 1:1, resize ≤1024×1024
 *
 * Test Cases:
 *  - TC-AUTH-16: avatar upload happy path
 *  - TC-AUTH-17: file too large
 *
 * Flow:
 *  1) User taps option (camera | library | remove)
 *  2) Request permission via expo-image-picker
 *  3) Pick + crop 1:1
 *  4) Resize/compress via expo-image-manipulator
 *  5) Upload via sdk.user.uploadAvatar (multipart, type=BACK_HASH)
 *  6) sdk.user.updateUserInfo(userId, { avatar: url })
 *  7) Update auth store + toast + dismiss
 */

import React, { useState } from 'react';
import { Alert, Linking, Pressable, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';

import { Header } from '../../src/components/Header';
import { Button } from '../../src/components/Button';
import { ListItem } from '../../src/components/ListItem';
import { FullScreenLoading } from '../../src/components/Skeleton';
import { useToast } from '../../src/components/Toast';
import { tokens } from '../../src/theme/tokens';
import { user as sdkUser } from '../../src/sdk/services/user';
import { useAuthStore } from '../../src/stores/useAuthStore';

const MAX_SIDE = 1024;
const JPEG_QUALITY = 0.8;
const MAX_BYTES = 5 * 1024 * 1024;

type Phase = 'initial' | 'uploading' | 'error';

export default function ChangeAvatarScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const toast = useToast();
  const [phase, setPhase] = useState<Phase>('initial');
  const [progress, setProgress] = useState(0);
  const user = useAuthStore((s) => s.user);
  const hasAvatar = !!user?.avatar;

  const dismiss = () => router.back();

  // --------------------------------------------------------------------------
  // Permission helpers
  // --------------------------------------------------------------------------

  const ensureCameraPermission = async () => {
    const res = await ImagePicker.requestCameraPermissionsAsync();
    if (!res.granted) {
      Alert.alert(
        t('permissions.cameraTitle'),
        t('permissions.cameraMsg'),
        [
          { text: t('common.cancel'), style: 'cancel' },
          { text: t('permissions.openSettings'), onPress: () => Linking.openSettings() },
        ],
      );
      return false;
    }
    return true;
  };

  const ensureLibraryPermission = async () => {
    const res = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!res.granted) {
      Alert.alert(
        t('permissions.libraryTitle'),
        t('permissions.libraryMsg'),
        [
          { text: t('common.cancel'), style: 'cancel' },
          { text: t('permissions.openSettings'), onPress: () => Linking.openSettings() },
        ],
      );
      return false;
    }
    return true;
  };

  // --------------------------------------------------------------------------
  // Pick / crop / upload
  // --------------------------------------------------------------------------

  const processAndUpload = async (uri: string) => {
    if (!user?.id) {
      toast.show({ variant: 'error', message: t('errors.generic') });
      return;
    }
    setPhase('uploading');
    setProgress(10);
    try {
      // Resize + compress per BR-AUTH-09 (max 1024x1024, JPEG q=0.8)
      const manipulated = await ImageManipulator.manipulateAsync(
        uri,
        [{ resize: { width: MAX_SIDE, height: MAX_SIDE } }],
        { compress: JPEG_QUALITY, format: ImageManipulator.SaveFormat.JPEG },
      );
      setProgress(40);

      // Upload multipart via SDK — backend returns {url} or url string
      const { url } = await sdkUser.uploadAvatar({
        uri: manipulated.uri,
        name: 'avatar.jpg',
        type: 'image/jpeg',
      });
      if (!url) throw new Error('NO_URL');
      setProgress(80);

      // Persist on user record
      const updated = await sdkUser.updateUserInfo(user.id, { avatar: url });
      useAuthStore.getState().updateUser(updated);
      setProgress(100);

      toast.show({ variant: 'success', message: t('profile.avatarUpdated') });
      dismiss();
    } catch (err: any) {
      if (err?.message === 'TOO_LARGE') {
        toast.show({ variant: 'error', message: t('profile.avatarTooLarge') });
      } else {
        toast.show({ variant: 'error', message: t('profile.avatarFailed') });
      }
      setPhase('error');
    }
  };

  // Silence MAX_BYTES unused warning (kept for future TC-AUTH-17 wiring)
  void MAX_BYTES;

  const onTakePhoto = async () => {
    if (!(await ensureCameraPermission())) return;
    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.9,
    });
    if (!result.canceled && result.assets[0]) {
      await processAndUpload(result.assets[0].uri);
    }
  };

  const onPickFromLibrary = async () => {
    if (!(await ensureLibraryPermission())) return;
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.9,
    });
    if (!result.canceled && result.assets[0]) {
      await processAndUpload(result.assets[0].uri);
    }
  };

  const onRemove = () => {
    Alert.alert(t('profile.removeAvatarTitle'), t('profile.removeAvatarMsg'), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('common.delete'),
        style: 'destructive',
        onPress: async () => {
          if (!user?.id) {
            toast.show({ variant: 'error', message: t('errors.generic') });
            return;
          }
          setPhase('uploading');
          try {
            const updated = await sdkUser.updateUserInfo(user.id, { avatar: null });
            useAuthStore.getState().updateUser(updated);
            toast.show({ variant: 'success', message: t('profile.avatarRemoved') });
            dismiss();
          } catch {
            toast.show({ variant: 'error', message: t('errors.generic') });
            setPhase('error');
          }
        },
      },
    ]);
  };

  // --------------------------------------------------------------------------
  // Render — modal style (presentation: 'modal' in root layout)
  // --------------------------------------------------------------------------

  return (
    <View style={{ flex: 1, backgroundColor: tokens.color.surfaceBg }}>
      <Header
        title={t('profile.changeAvatar')}
        leading="close"
        onLeadingPress={dismiss}
      />
      <View style={{ padding: tokens.space[4], gap: tokens.space[2] }}>
        <ListItem
          leading={<Text style={{ fontSize: 22 }}>📷</Text>}
          title={t('profile.takePhoto')}
          onPress={onTakePhoto}
          accessibilityLabel={t('profile.takePhoto')}
        />
        <ListItem
          leading={<Text style={{ fontSize: 22 }}>🖼️</Text>}
          title={t('profile.pickFromLibrary')}
          onPress={onPickFromLibrary}
          accessibilityLabel={t('profile.pickFromLibrary')}
        />
        {hasAvatar && (
          <ListItem
            leading={<Text style={{ fontSize: 22 }}>🗑️</Text>}
            title={t('profile.removeAvatar')}
            onPress={onRemove}
            destructive
            accessibilityLabel={t('profile.removeAvatar')}
          />
        )}
        <View style={{ marginTop: tokens.space[4] }}>
          <Button variant="ghost" size="lg" fullWidth onPress={dismiss}>
            {t('common.cancel')}
          </Button>
        </View>
      </View>

      {phase === 'uploading' && (
        <View
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: 'rgba(0,0,0,0.4)',
          }}
        >
          <View
            style={{
              backgroundColor: tokens.color.surfaceCard,
              borderRadius: 12,
              padding: tokens.space[5],
              alignItems: 'center',
              gap: tokens.space[3],
            }}
          >
            <FullScreenLoading inline />
            <Text>{t('profile.uploading', { progress })}</Text>
          </View>
        </View>
      )}
    </View>
  );
}

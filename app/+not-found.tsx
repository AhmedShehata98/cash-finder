import { Link, Stack } from 'expo-router';
import { StyleSheet } from 'react-native';

import { useI18n } from '@/i18n';
import { Text, View } from '@/components/Themed';

export default function NotFoundScreen() {
  const { t } = useI18n()

  return (
    <>
      <Stack.Screen options={{ title: t('headers.notFound') }} />
      <View style={styles.container}>
        <Text style={styles.title}>{t('notFound.title')}</Text>

        <Link href="/" style={styles.link}>
          <Text style={styles.linkText}>{t('notFound.link')}</Text>
        </Link>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  link: {
    marginTop: 15,
    paddingVertical: 15,
  },
  linkText: {
    fontSize: 14,
    color: '#2e78b7',
  },
});

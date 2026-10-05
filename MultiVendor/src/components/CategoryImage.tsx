import React, { useState } from 'react';
import { Image, StyleSheet, type ImageSourcePropType } from 'react-native';

import { Icon, type IconName } from './Icon';
import { COLORS } from '../theme';

type Props = {
  source?: ImageSourcePropType;
  fallbackIcon?: IconName;
  iconSize?: number;
  iconColor?: string;
};

export function CategoryImage({
  source,
  fallbackIcon = 'shop',
  iconSize = 27,
  iconColor = COLORS.tealDark,
}: Props) {
  const [failedSource, setFailedSource] = useState<ImageSourcePropType>();

  if (!source || source === failedSource) {
    return <Icon name={fallbackIcon} size={iconSize} color={iconColor} />;
  }

  return (
    <Image
      accessible={false}
      importantForAccessibility="no"
      source={source}
      resizeMode="cover"
      onError={() => setFailedSource(source)}
      style={styles.image}
    />
  );
}

const styles = StyleSheet.create({
  image: { width: '100%', height: '100%' },
});

import React, { ReactNode } from 'react';
import { StyleSheet, View, ViewStyle } from 'react-native';
import { borderRadius, colors, spacing } from '../../theme/design';

type CardPadding = 'sm' | 'md' | 'lg';

interface CardProps {
  children: ReactNode;
  style?: ViewStyle;
  padding?: CardPadding;
}

export const Card: React.FC<CardProps> = ({ 
  children, 
  style, 
  padding = 'md', 
  ...props 
}) => {
  const cardStyles: ViewStyle[] = [
    styles.base,
    styles[`padding${padding.charAt(0).toUpperCase() + padding.slice(1)}` as keyof typeof styles] as ViewStyle,
    style,
  ].filter(Boolean) as ViewStyle[];

  return (
    <View style={cardStyles} {...props}>
      {children}
    </View>
  );
};

const styles = StyleSheet.create({
  base: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.xl,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  paddingSm: {
    padding: spacing.md,
  },
  paddingMd: {
    padding: spacing.lg,
  },
  paddingLg: {
    padding: spacing.xl,
  },
});

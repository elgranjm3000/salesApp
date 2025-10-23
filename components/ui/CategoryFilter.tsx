import { Ionicons } from '@expo/vector-icons';
import React, { useState } from 'react';
import {
    FlatList,
    Modal,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import { borderRadius, colors, spacing, typography } from '../../theme/design';
import type { Category } from '../../types';

interface CategoryFilterProps {
  categories: Category[];
  selectedCategory: Category | null;
  onSelectCategory: (category: Category | null) => void;
}

const CategoryFilter: React.FC<CategoryFilterProps> = ({
  categories,
  selectedCategory,
  onSelectCategory,
}) => {
  const [showSearchModal, setShowSearchModal] = useState(false);
  const [searchText, setSearchText] = useState('');

  // Ordenar categorías alfabéticamente
  const sortedCategories = [...categories].sort((a, b) => 
    a.description.localeCompare(b.description)
  );

  // Filtrar categorías según el texto de búsqueda
  const filteredCategories = sortedCategories.filter(category =>
    category.description.toLowerCase().includes(searchText.toLowerCase())
  );

  const handleSelectCategory = (category: Category | null) => {
    onSelectCategory(category);
    setShowSearchModal(false);
    setSearchText('');
  };

  return (
    <View style={styles.categoriesSection}>
      <Text style={styles.departmentsTitle}>DEPARTAMENTOS</Text>
      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.categoriesScrollContainer}
      >
        {/* Ícono de lupa para búsqueda */}
        <TouchableOpacity
          style={[
            styles.categoryChip,
            styles.searchChip,
            !selectedCategory && styles.categoryChipActive
          ]}
          onPress={() => setShowSearchModal(true)}
        >
          <Ionicons 
            name="search" 
            size={20} 
            color={!selectedCategory ? colors.text.inverse : colors.text.primary}
          />
        </TouchableOpacity>
        
        {/* Chips de categorías */}
        {sortedCategories.map((category) => (
          <TouchableOpacity
            key={category.id}
            style={[
              styles.categoryChip,
              selectedCategory?.id === category.id && styles.categoryChipActive
            ]}
            onPress={() => handleSelectCategory(category)}
          >
            <Text style={[
              styles.categoryChipText,
              selectedCategory?.id === category.id && styles.categoryChipActiveText
            ]}>
              {category.description}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Modal de búsqueda */}
      <Modal
        visible={showSearchModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowSearchModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            {/* Header del Modal */}
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Buscar Departamento</Text>
              <TouchableOpacity 
                onPress={() => {
                  setShowSearchModal(false);
                  setSearchText('');
                }}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Ionicons 
                  name="close" 
                  size={24} 
                  color={colors.text.primary}
                />
              </TouchableOpacity>
            </View>

            {/* Campo de búsqueda */}
            <View style={styles.searchInputContainer}>
              <Ionicons 
                name="search" 
                size={20} 
                color={colors.text.secondary}
                style={styles.searchInputIcon}
              />
              <TextInput
                style={styles.searchInput}
                placeholder="Escribe el nombre del departamento..."
                placeholderTextColor={colors.text.secondary}
                value={searchText}
                onChangeText={setSearchText}
                autoFocus
              />
              {searchText !== '' && (
                <TouchableOpacity 
                  onPress={() => setSearchText('')}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  <Ionicons 
                    name="close-circle" 
                    size={20} 
                    color={colors.text.secondary}
                  />
                </TouchableOpacity>
              )}
            </View>

            {/* Opción "Ver todos" */}
            <TouchableOpacity
              style={styles.allDepartmentsOption}
              onPress={() => handleSelectCategory(null)}
            >
              <View style={styles.optionContent}>
                <Text style={styles.optionText}>Ver todos</Text>
                <Text style={styles.optionSubtext}>Mostrar todos los departamentos</Text>
              </View>
              {!selectedCategory && (
                <View style={styles.checkmark}>
                  <Ionicons 
                    name="checkmark" 
                    size={20} 
                    color={colors.primary[500]}
                  />
                </View>
              )}
            </TouchableOpacity>

            {/* Lista de categorías filtradas */}
            <FlatList
              data={filteredCategories}
              keyExtractor={(item) => item.id.toString()}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.categoryOption}
                  onPress={() => handleSelectCategory(item)}
                >
                  <View style={styles.optionContent}>
                    <Text style={styles.optionText}>{item.description}</Text>
                  </View>
                  {selectedCategory?.id === item.id && (
                    <View style={styles.checkmark}>
                      <Ionicons 
                        name="checkmark" 
                        size={20} 
                        color={colors.primary[500]}
                      />
                    </View>
                  )}
                </TouchableOpacity>
              )}
              ListEmptyState={
                searchText !== '' && (
                  <View style={styles.emptyState}>
                    <Ionicons 
                      name="search-outline" 
                      size={40} 
                      color={colors.text.secondary}
                      style={styles.emptyIcon}
                    />
                    <Text style={styles.emptyText}>
                      No se encontraron departamentos con "{searchText}"
                    </Text>
                  </View>
                )
              }
            />
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  categoriesSection: {
    backgroundColor: colors.surface,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.gray[100],
    paddingBottom: 110,
  },
  departmentsTitle: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.bold,
    color: colors.text.primary,
    textAlign: 'center',
    marginBottom: spacing.sm,
    letterSpacing: 1,
  },
  categoriesScrollContainer: {
    paddingHorizontal: spacing.lg,
    gap: spacing.sm,
  },
  categoryChip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: colors.gray[100],
    borderRadius: borderRadius.full,
    borderWidth: 1,
    borderColor: colors.gray[200],
    justifyContent: 'center',
    alignItems: 'center',
  },
  searchChip: {
    width: 44,
    height: 40,
    paddingHorizontal: 0,
    paddingVertical: 0,
  },
  categoryChipActive: {
    backgroundColor: colors.primary[500],
    borderColor: colors.primary[500],
  },
  categoryChipText: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.medium,
    color: colors.text.secondary,
  },
  categoryChipActiveText: {
    color: colors.text.inverse,
  },
  // Estilos del Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: borderRadius.lg,
    borderTopRightRadius: borderRadius.lg,
    maxHeight: '90%',
    paddingBottom: spacing.lg,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.gray[100],
  },
  modalTitle: {
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.bold,
    color: colors.text.primary,
  },
  searchInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: spacing.lg,
    marginVertical: spacing.md,
    paddingHorizontal: spacing.md,
    backgroundColor: colors.gray[100],
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.gray[200],
    height: 44,
    gap: spacing.sm,
  },
  searchInputIcon: {
    color: colors.text.secondary,
  },
  searchInput: {
    flex: 1,
    fontSize: typography.fontSize.base,
    color: colors.text.primary,
    paddingVertical: spacing.sm,
  },
  allDepartmentsOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.gray[100],
  },
  categoryOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.gray[50],
  },
  optionContent: {
    flex: 1,
  },
  optionText: {
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.medium,
    color: colors.text.primary,
    marginBottom: spacing.xs,
  },
  optionSubtext: {
    fontSize: typography.fontSize.sm,
    color: colors.text.secondary,
  },
  checkmark: {
    width: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: spacing.md,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing['2xl'],
  },
  emptyIcon: {
    marginBottom: spacing.md,
    opacity: 0.5,
  },
  emptyText: {
    fontSize: typography.fontSize.base,
    color: colors.text.secondary,
    textAlign: 'center',
    paddingHorizontal: spacing.lg,
  },
});

export default CategoryFilter;
//Remover temporalmente.
import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import {
  FlatList,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Theme } from '../constants/Theme';

const dummyProjects = ['Project 1', 'Project 2', 'Project 3'];

export default function Header({
  currentProject,
  onProjectChange,
}: {
  currentProject: string;
  onProjectChange: (project: string) => void;
}) {
  const [modalVisible, setModalVisible] = useState(false);

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.headerContainer}>
        <TouchableOpacity onPress={() => {}}>
          <Ionicons name="menu" size={24} color={Theme.colors.textOnPrimary} />
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => setModalVisible(true)}
          style={styles.projectSelector}
        >
          <Text style={styles.title}>{currentProject}</Text>
          <Ionicons name="chevron-down" size={20} color={Theme.colors.textOnPrimary} />
        </TouchableOpacity>

        <TouchableOpacity onPress={() => {}}>
          <Ionicons name="ellipsis-vertical" size={24} color={Theme.colors.textOnPrimary} />
        </TouchableOpacity>
      </View>

      <Modal visible={modalVisible} transparent animationType="slide">
        <Pressable
          style={styles.modalBackground}
          onPress={() => setModalVisible(false)}
        >
          <View style={styles.modalContainer}>
            <FlatList
              data={dummyProjects}
              keyExtractor={(item) => item}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.projectItem}
                  onPress={() => {
                    onProjectChange(item);
                    setModalVisible(false);
                  }}
                >
                  <Text>{item}</Text>
                </TouchableOpacity>
              )}
            />
          </View>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    backgroundColor: Theme.colors.primary,
  },
  headerContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Theme.spacing.md,
    paddingVertical: Theme.spacing.sm,
    backgroundColor: Theme.colors.primary,
  },
  title: {
    fontSize: Theme.typography.md,
    fontWeight: Theme.typography.semiBold,
    color: Theme.colors.textOnPrimary,
  },
  projectSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Theme.spacing.xs,
  },
  modalBackground: {
    flex: 1,
    justifyContent: 'flex-start',
    backgroundColor: Theme.colors.overlay,
  },
  modalContainer: {
    // Offsets propios del posicionamiento del modal, no del sistema de espaciado
    marginTop: 80,
    marginHorizontal: 40,
    backgroundColor: Theme.colors.surface,
    borderRadius: Theme.radius.md,
    padding: Theme.spacing.sm,
    ...Theme.shadow.lg,
  },
  projectItem: {
    paddingVertical: Theme.spacing.sm,
    paddingHorizontal: Theme.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Theme.colors.divider,
  },
});
